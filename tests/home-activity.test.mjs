import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { changeSession, elapsed, emptySnapshot, parseSnapshot, startSession } from '../src/modules/workout-sessions/model.ts';

test('Home counts saved sessions completed today, including sessions under one minute', () => {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const exerciseId = 'bodyweight-squat';
  const start = (snapshot, id, at) => startSession(snapshot, exerciseId, 1, 0, id, at);
  const complete = (snapshot, id, at) =>
    changeSession(changeSession(snapshot, id, 'set', at), id, 'complete', at);

  let snapshot = complete(start(emptySnapshot, 'yesterday', midnight - 300_001), 'yesterday', midnight - 1);
  snapshot = complete(start(snapshot, 'crosses-midnight', midnight - 15_000), 'crosses-midnight', midnight + 15_000);
  snapshot = changeSession(start(snapshot, 'cancelled', midnight + 30_000), 'cancelled', 'cancel', midnight + 150_000);
  snapshot = start(snapshot, 'active', midnight + 160_000);
  snapshot = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));

  const element = (type, props) => ({ type, props });
  const modules = {
    'react': {
      useState: (init) => [init(), () => {}],
      useMemo: (compute) => compute(),
      useCallback: (callback) => callback,
    },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { StyleSheet: { create: (styles) => styles }, useColorScheme: () => 'light' },
    'react-native-safe-area-context': {},
    'react-native-svg': {},
    'expo-router': { useFocusEffect: () => {} },
    '@/modules/exercise-catalog': { getExercise: () => ({ name: 'Bodyweight Squat' }) },
    '@/modules/workout-sessions': { elapsed, useSessions: () => ({ snapshot }) },
    '../../../assets/images/fitness-app-logo.png': 0,
  };
  const { outputText } = ts.transpileModule(
    readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  );
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`);
      return modules[name];
    },
  });

  const renderText = (node) => {
    if (Array.isArray(node)) return node.map(renderText).join('');
    if (typeof node === 'object' && node) return renderText(node.props.children);
    return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  };

  assert.match(renderText(exports.default({})), /0\.5 \/ 60 min/);
  snapshot = complete(snapshot, 'active', midnight + 205_000);
  assert.match(renderText(exports.default({})), /1\.3 \/ 60 min/);
});
