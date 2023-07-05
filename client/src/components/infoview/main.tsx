/* Partly copied from https://github.com/leanprover/vscode-lean4/blob/master/lean4-infoview/src/infoview/main.tsx */

import * as React from 'react';
import type { DidCloseTextDocumentParams, DidChangeTextDocumentParams, Location, DocumentUri } from 'vscode-languageserver-protocol';

import 'tachyons/css/tachyons.css';
import '@vscode/codicons/dist/codicon.css';
import '../../../../node_modules/lean4-infoview/src/infoview/index.css';
import './infoview.css'

import { LeanFileProgressParams, LeanFileProgressProcessingInfo, defaultInfoviewConfig, EditorApi, InfoviewApi } from '@leanprover/infoview-api';
import { useClientNotificationEffect, useServerNotificationEffect, useEventResult, useServerNotificationState } from '../../../../node_modules/lean4-infoview/src/infoview/util';
import { EditorContext, ConfigContext, ProgressContext, VersionContext } from '../../../../node_modules/lean4-infoview/src/infoview/contexts';
import { WithRpcSessions } from '../../../../node_modules/lean4-infoview/src/infoview/rpcSessions';
import { ServerVersion } from '../../../../node_modules/lean4-infoview/src/infoview/serverVersion';

import { GameIdContext } from './context';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { LevelInfo } from '../../state/api';
import { levelCompleted, selectCompleted } from '../../state/progress';
import Markdown from '../markdown';

import { Infos } from './infos';
import { AllMessages, WithLspDiagnosticsContext } from './messages';
import { Goal } from './goals';
import { InputModeContext, ProofStateContext } from './context';
import { CommandLine } from './command_line';


// The mathematical formulation of the statement, supporting e.g. Latex
// It takes three forms, depending on the precence of name and description:
// - Theorem xyz: description
// - Theorem xyz
// - Exercises: description
function ExerciseStatement({data}) {
  if (!data?.descrText) { return <></> }
  return <div className="exercise-statement"><Markdown>
    {(data?.statementName ? `**Theorem** \`${data?.statementName}\`: ` : data?.descrText && "**Exercise**: ") + `${data?.descrText}` }
  </Markdown></div>
}

// TODO: This is only used in `EditorInterface`
// while `CommandLineInterface` has this copy-pasted in.
export function Main(props: {world: string, level: number}) {
    const ec = React.useContext(EditorContext);
    const gameId = React.useContext(GameIdContext)

    const dispatch = useAppDispatch()

    // Mark level as completed when server gives notification
    useServerNotificationEffect(
        '$/game/completed',
        (params: any) => {

            if (ec.events.changedCursorLocation.current &&
                ec.events.changedCursorLocation.current.uri === params.uri) {
                dispatch(levelCompleted({game: gameId, world: props.world, level: props.level}))
            }
        },
        []
    );

    const completed = useAppSelector(selectCompleted(gameId, props.world, props.level))

    /* Set up updates to the global infoview state on editor events. */
    const config = useEventResult(ec.events.changedInfoviewConfig) ?? defaultInfoviewConfig;

    const [allProgress, _1] = useServerNotificationState(
        '$/lean/fileProgress',
        new Map<DocumentUri, LeanFileProgressProcessingInfo[]>(),
        async (params: LeanFileProgressParams) => (allProgress) => {
            const newProgress = new Map(allProgress);
            return newProgress.set(params.textDocument.uri, params.processing);
        },
        []
    );

    const curUri = useEventResult(ec.events.changedCursorLocation, loc => loc?.uri);

    useClientNotificationEffect(
        'textDocument/didClose',
        (params: DidCloseTextDocumentParams) => {
            if (ec.events.changedCursorLocation.current &&
                ec.events.changedCursorLocation.current.uri === params.textDocument.uri) {
                ec.events.changedCursorLocation.fire(undefined)
            }
        },
        []
    );

    const serverVersion =
        useEventResult(ec.events.serverRestarted, result => new ServerVersion(result.serverInfo?.version ?? ''))
    const serverStoppedResult = useEventResult(ec.events.serverStopped);
    // NB: the cursor may temporarily become `undefined` when a file is closed. In this case
    // it's important not to reconstruct the `WithBlah` wrappers below since they contain state
    // that we want to persist.
    let ret
    if (!serverVersion) {
        ret = <p>Waiting for Lean server to start...</p>
    } else if (serverStoppedResult){
        ret = <div><p>{serverStoppedResult.message}</p><p className="error">{serverStoppedResult.reason}</p></div>
    } else {
        ret = <div className="infoview vscode-light">
            {completed && <div className="level-completed">Level completed! 🎉</div>}
            <Infos />
        </div>
    }

    return (
    <ConfigContext.Provider value={config}>
        <VersionContext.Provider value={serverVersion}>
            <WithRpcSessions>
                <WithLspDiagnosticsContext>
                    <ProgressContext.Provider value={allProgress}>
                        {ret}
                    </ProgressContext.Provider>
                </WithLspDiagnosticsContext>
            </WithRpcSessions>
        </VersionContext.Provider>
    </ConfigContext.Provider>
    );
}

// `codeviewRef`: the codeViewRef. Used to edit the editor's content even if not visible
export function EditorInterface({data, codeviewRef, hidden, worldId, levelId, editorConnection}) {

  const { commandLineMode, setCommandLineMode } = React.useContext(InputModeContext)

  return <div className={hidden ? 'hidden' : ''}>
    <ExerciseStatement data={data} />
    <div className={`statement ${commandLineMode ? 'hidden' : ''}`}><code>{data?.descrFormat}</code></div>
    <div ref={codeviewRef} className={'codeview'}></div>
    {editorConnection && <Main key={`${worldId}/${levelId}`} world={worldId} level={levelId} />}

  </div>
}

export function CommandLineInterface(props: {world: string, level: number, data: LevelInfo}) {

  const ec = React.useContext(EditorContext);
  const gameId = React.useContext(GameIdContext)

  const proofStateContext = React.useContext(ProofStateContext)

  const [selectedGoal, setSelectedGoal] = React.useState<number>(0)

  const dispatch = useAppDispatch()

  // Mark level as completed when server gives notification
  useServerNotificationEffect(
      '$/game/completed',
      (params: any) => {

          if (ec.events.changedCursorLocation.current &&
              ec.events.changedCursorLocation.current.uri === params.uri) {
              dispatch(levelCompleted({game: gameId, world: props.world, level: props.level}))
          }
      },
      []
  );

  const completed = useAppSelector(selectCompleted(gameId, props.world, props.level))

  /* Set up updates to the global infoview state on editor events. */
  const config = useEventResult(ec.events.changedInfoviewConfig) ?? defaultInfoviewConfig;

  const [allProgress, _1] = useServerNotificationState(
      '$/lean/fileProgress',
      new Map<DocumentUri, LeanFileProgressProcessingInfo[]>(),
      async (params: LeanFileProgressParams) => (allProgress) => {
          const newProgress = new Map(allProgress);
          return newProgress.set(params.textDocument.uri, params.processing);
      },
      []
  );

  const curUri = useEventResult(ec.events.changedCursorLocation, loc => loc?.uri);

  useClientNotificationEffect(
      'textDocument/didClose',
      (params: DidCloseTextDocumentParams) => {
          if (ec.events.changedCursorLocation.current &&
              ec.events.changedCursorLocation.current.uri === params.textDocument.uri) {
              ec.events.changedCursorLocation.fire(undefined)
          }
      },
      []
  );

  const goalFilter = { reverse: false, showType: true, showInstance: true, showHiddenAssumption: true, showLetValue: true }

  const serverVersion =
      useEventResult(ec.events.serverRestarted, result => new ServerVersion(result.serverInfo?.version ?? ''))
  const serverStoppedResult = useEventResult(ec.events.serverStopped);
  // NB: the cursor may temporarily become `undefined` when a file is closed. In this case
  // it's important not to reconstruct the `WithBlah` wrappers below since they contain state
  // that we want to persist.
  let ret
  if (!serverVersion) {
      ret = <p>Waiting for Lean server to start...</p>
  } else if (serverStoppedResult){
      ret = <div><p>{serverStoppedResult.message}</p><p className="error">{serverStoppedResult.reason}</p></div>
  } else {
      //className="infoview vscode-light"
      ret = <div className="commandline-interface">
          {/* {completed && <div className="level-completed">Level completed! 🎉</div>} */}
          <div className="content">
            <ExerciseStatement data={props.data} />
            <Infos />
            <div className="tmp-pusher"></div>
            <div className="tab-bar">
              {proofStateContext.proofState.goals?.goals.map((goal, i) =>
                <div className={`tab ${i == (selectedGoal) ? "active": ""}`}
                    onClick={() => { setSelectedGoal(i) }}>
                  {i ? `Goal ${i+1}` : "Active Goal"}
                </div>)}
            </div>
            <div className="goal-tab vscode-light">
              {proofStateContext.proofState.goals?.goals?.length &&
                <Goal commandLine={false} filter={goalFilter} goal={proofStateContext.proofState.goals.goals[selectedGoal]} />
              }
            </div>
          </div>
          <CommandLine />
      </div>
  }

  return <>
    {/* <button className="btn" onClick={handleUndo} disabled={!canUndo}><FontAwesomeIcon icon={faRotateLeft} /> Undo</button> */}
    <ConfigContext.Provider value={config}>
      <VersionContext.Provider value={serverVersion}>
        <WithRpcSessions>
          <WithLspDiagnosticsContext>
            <ProgressContext.Provider value={allProgress}>
              {ret}
            </ProgressContext.Provider>
          </WithLspDiagnosticsContext>
        </WithRpcSessions>
      </VersionContext.Provider>
    </ConfigContext.Provider>
  </>


}
