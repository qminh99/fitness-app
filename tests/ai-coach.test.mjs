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
  const cleanups = [];
  const requests = [];
  let cursor = 0;
  let tree;
  let alertButtons;
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
    useCallback: (callback) => callback,
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = true;
        cleanups.push(effect());
      }
    },
  };
  const native = Object.fromEntries([
    'FlatList', 'KeyboardAvoidingView', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View',
  ].map((name) => [name, name]));
  Object.assign(native, {
    Platform: { OS: 'ios' },
    StyleSheet: { create: (styles) => styles },
    Alert: { alert: (_title, _message, buttons) => { alertButtons = buttons; } },
  });
  const screen = load('src/modules/ai-coach/ui/CoachScreen.tsx', (name) => {
    if (name === 'react') return react;
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
    tree = screen.CoachScreen({ onOpenExerciseDetail: () => {} });
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
  const scenario = (text) => find((node) => node.type === 'Pressable' &&
    node.props.children.some((child) => child?.props?.children?.includes(text)));
  function type(text) { label('Describe your concern').onChangeText(text); render(); }
  function reset() {
    label('Start a new chat').onPress();
    alertButtons?.find((button) => button.text === 'Confirm')?.onPress();
    render();
  }
  render();
  return {
    render, label, scenario, type, reset, requests,
    messages: () => [...walk(tree)].find((node) => node.type === 'FlatList')?.props.data ?? [],
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

test('Coach same-tick double Send produces one turn and allows the next turn', async () => {
  const ui = createScreen();
  try {
    ui.type('Preview message');
    const send = ui.label('Send message').onPress;
    send(); send();
    await flush(); ui.render();
    assert.equal(ui.requests.length, 1);
    assert.equal(ui.messages().filter((message) => message.role === 'user').length, 1);
    assert.equal(ui.messages().filter((message) => message.role === 'coach').length, 1);
    ui.type('Next message');
    assert.equal(ui.label('Send message').disabled, false);
    ui.label('Send message').onPress();
    await flush(); ui.render();
    assert.equal(ui.messages().length, 4);
  } finally { ui.unmount(); }
});

test('Coach double Confirm records an answer only once', async () => {
  const ui = createScreen();
  try {
    ui.label('Try sample conversation').onPress();
    await flush(); ui.render();
    ui.label('Answer option Not sure').onPress(); ui.render();
    const confirm = ui.label('Confirm selected answer').onPress;
    confirm(); confirm();
    await flush(); ui.render();
    assert.equal(ui.requests.length, 2);
    assert.equal(ui.requests[1].answers.q_leg_location, 'not_sure');
    assert.equal(ui.messages().filter((message) => message.content === 'Not sure').length, 1);
    assert.equal(ui.messages().length, 4);
  } finally { ui.unmount(); }
});

for (const outcome of ['resolve', 'reject']) {
  test(`Coach ignores old ${outcome} after reset without unlocking a pending new turn`, async () => {
    const pending = [];
    const ui = createScreen((request) => new Promise((resolve, reject) => {
      pending.push({ request, resolve, reject });
    }));
    try {
      ui.type('Old message'); ui.label('Send message').onPress(); ui.render();
      ui.reset();
      ui.type('New message'); ui.label('Send message').onPress(); ui.render();
      if (outcome === 'resolve') pending[0].resolve(await preview.requestGuidance(pending[0].request));
      else pending[0].reject(new Error('Old failure'));
      await flush(); ui.render();
      assert.equal(ui.messages().length, 1);
      assert.equal(ui.messages()[0].content, 'New message');
      assert.equal(ui.label('Send message').disabled, true);
      // Call despite the disabled native control to check the synchronous guard.
      ui.label('Send message').onPress();
      assert.equal(ui.requests.length, 2);
      pending[1].resolve(await preview.requestGuidance(pending[1].request));
      await flush(); ui.render();
      assert.equal(ui.messages().length, 2);
      ui.type('Ready again');
      assert.equal(ui.label('Send message').disabled, false);
    } finally { ui.unmount(); }
  });
}

test('Coach preview error retries once even with same-tick double Retry', async () => {
  const ui = createScreen();
  try {
    ui.label('Toggle preview scenarios panel').onPress(); ui.render();
    ui.scenario('Error + Retry').onPress();
    await flush(); ui.render();
    ui.type('Draft to preserve');
    const retry = ui.label('Retry failed request').onPress;
    retry(); retry();
    await flush(); ui.render();
    assert.equal(ui.requests.length, 2);
    assert.equal(ui.messages().length, 1);
    assert.equal(ui.messages()[0].role, 'coach');
    assert.equal(ui.label('Describe your concern').value, 'Draft to preserve');
  } finally { ui.unmount(); }
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
