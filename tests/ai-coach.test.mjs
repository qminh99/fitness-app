import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual screen callbacks with deferred requests, without installing
// a native renderer. This harness does not verify layout, navigation or accessibility.
const root = path.resolve(import.meta.dirname, '..');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function load(file, requireModule) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  vm.runInNewContext(outputText, { exports, require: requireModule, ...testGlobals });
  return exports;
}

const testGlobals = { Date, Promise, setTimeout, clearTimeout };
const catalog = load('src/modules/exercise-catalog/catalog.ts');
const model = load('src/modules/ai-coach/model.ts');
const tokens = load('src/ui/tokens.ts');
const preview = load('src/modules/ai-coach/preview.ts', (name) => {
  if (name === '@/modules/exercise-catalog') return catalog;
  if (name === './model') return model;
  throw new Error(`Unexpected import: ${name}`);
});

function createScreen(service = preview.requestGuidance) {
  const slots = [];
  const requests = [];
  let cursor = 0;
  let tree;
  const opened = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },

  };
  const native = Object.fromEntries([
    'FlatList', 'KeyboardAvoidingView', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View',
  ].map((name) => [name, name]));
  Object.assign(native, {
    Platform: { OS: 'ios' },
    StyleSheet: { create: (styles) => styles },
    Keyboard: { dismiss() {} },
  });
  const screen = load('src/modules/ai-coach/ui/CoachScreen.tsx', (name) => {
    if (name === 'react') return react;
    if (name === '@expo/vector-icons/Ionicons') return 'Ionicons';
    if (name === '@/modules/exercise-catalog') return catalog;
    if (name === 'react-native') return native;
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@/ui') return { ...tokens, useReducedMotion: () => true };
    if (name === '../model') return model;
    if (name === '../preview') return {
      ...preview,
      requestGuidance: (request) => { requests.push(request); return service(request); },
    };
    throw new Error(`Unexpected import: ${name}`);
  });
  function render() {
    cursor = 0;
    tree = screen.CoachScreen({ onOpenExerciseDetail: (id) => opened.push(id) });
  }
  function* walk(node) {
    if (Array.isArray(node)) { for (const child of node) yield* walk(child); return; }
    if (!node || typeof node !== 'object') return;
    yield node;
    if (node.type === 'FlatList') {
      for (const item of node.props.data) yield* walk(node.props.renderItem({ item }));
    }
    yield* walk(node.props.children);
  }
  function find(predicate) {
    const element = [...walk(tree)].find(predicate);
    assert.ok(element, 'Expected control is present');
    return element.props;
  }
  const label = (text) => find((node) => node.props.accessibilityLabel === text);
  function type(text) { label('Your message').onChangeText(text); render(); }
  function newChat() { label('Start a new chat').onPress(); render(); }
  function history() {
    find((node) => node.props.accessibilityState?.expanded !== undefined).onPress();
    render();
  }
  function openChat(title) {
    find((node) => node.props.accessibilityState?.selected !== undefined &&
      node.props.children[0]?.props.children.includes(title)).onPress();
    render();
  }
  render();
  return {
    render, label, type, newChat, history, openChat, requests, opened,
    messages: () => [...walk(tree)].find((node) => node.type === 'FlatList').props.data,
  };
}

test('Coach sends one turn and offers three working catalog links', async () => {
  const ui = createScreen();
  ui.type('Show me something to try');
  const send = ui.label('Send message').onPress;
  send(); send();
  await flush(); ui.render();

  assert.equal(ui.requests.length, 1);
  assert.equal(ui.messages().filter(({ role }) => role === 'user').length, 1);
  const suggestions = ui.messages().at(-1).suggestions;
  assert.equal(new Set(suggestions.map(({ exerciseId }) => exerciseId)).size, 3);
  for (const { exerciseId } of suggestions) {
    const exercise = catalog.getExercise(exerciseId);
    assert.ok(exercise);
    ui.label(`View ${exercise.name}`).onPress();
    assert.equal(ui.opened.at(-1), exerciseId);
  }
  ui.type('Next message');
  assert.equal(ui.label('Send message').disabled, false);
});

test('Chat history restores the right thread even if its reply arrived in another chat', async () => {
  let complete;
  const ui = createScreen((request) => new Promise((resolve) => {
    complete = async () => resolve(await preview.requestGuidance(request));
  }));
  ui.type('First conversation');
  ui.label('Send message').onPress(); ui.render();
  ui.newChat();
  await complete();
  await flush(); ui.render();
  assert.equal(ui.messages().length, 1);
  ui.history();
  ui.openChat('First conversation');
  assert.equal(ui.messages()[1].content, 'First conversation');
  assert.equal(ui.messages()[2].suggestions.length, 3);
});

test('Coach resolves every real catalog exercise and rejects unknown/prototype IDs', () => {
  for (const exercise of catalog.exercises) {
    const card = preview.resolveCatalogExercise(exercise.id);
    assert.equal(card.isAvailable, true);
    assert.equal(card.title, exercise.name);
    assert.equal(card.category, exercise.group);
  }
  for (const id of ['non-existent-exercise-999', 'toString', '__proto__']) {
    assert.equal(preview.resolveCatalogExercise(id).isAvailable, false);
  }
});
