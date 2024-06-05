import * as React from 'react'
import { useEffect } from 'react'
import Split from 'react-split'
import { Box, CircularProgress } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'

import { GameIdContext } from '../app'
import { useAppDispatch, useAppSelector } from '../hooks'
import { changedReadIntro, selectReadIntro } from '../state/progress'
import { useGetGameInfoQuery, useLoadInventoryOverviewQuery } from '../state/api'
import { Button } from './button'
import { PageContext, PreferencesContext } from './infoview/context'
import { InventoryPanel } from './inventory'
import { ErasePopup } from './popup/erase'
import { InfoPopup } from './popup/info'
import { PrivacyPolicyPopup } from './popup/privacy'
import { UploadPopup } from './popup/upload'
import { PreferencesPopup} from "./popup/preferences"
import { WorldTreePanel } from './world_tree'

import '../css/welcome.css'
import { Hint } from './hints'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'


/** the panel showing the game's introduction text */
function IntroductionPanel({introduction, setPageNumber}: {introduction: string, setPageNumber}) {
  const {mobile} = React.useContext(PreferencesContext)
  const {gameId} = React.useContext(GameIdContext)

  let { t } = useTranslation()

  const dispatch = useAppDispatch()

  // TODO: I left the setup for splitting up the introduction in place, but if it's not needed
  // then this can be simplified.

  // let text: Array<string> = introduction.split(/\n(\s*\n)+/)
  let text: Array<string> = introduction ? [t(introduction, {ns : gameId})] : []

  return <div className="column chat-panel">
    <div className="chat">
      {text?.map(((t, i) =>
        t.trim() ?
          <Hint key={`intro-p-${i}`}
            hint={{text: t, hidden: false, rawText: t, varNames: []}}
            step={0} selected={null} toggleSelection={undefined} />
        : <></>
      ))}
    </div>
    {mobile &&
      <div className="button-row">
        <Button className="btn" to=""
          title="" onClick={() => {
            setPageNumber(1);
            dispatch(changedReadIntro({game: gameId, readIntro: true}))
          }}>
          Start&nbsp;<FontAwesomeIcon icon={faArrowRight}/>
        </Button>
      </div>
    }
  </div>
}

/** main page of the game showing among others the tree of worlds/levels */
function Welcome() {
  const {gameId, worldId} = React.useContext(GameIdContext)

  // Load the namespace of the game
  i18next.loadNamespaces(gameId)

  const {mobile} = React.useContext(PreferencesContext)
  const {layout, isSavePreferences, language, setLayout, setIsSavePreferences, setLanguage} = React.useContext(PreferencesContext)

  const gameInfo = useGetGameInfoQuery({game: gameId})
  const inventory = useLoadInventoryOverviewQuery({game: gameId})

  // For mobile only
  const readIntro = useAppSelector(selectReadIntro(gameId, worldId))

  const {page, setPage} = React.useContext(PageContext)

  // TODO: recover `readIntro` functionality

  // const [pageNumber, setPageNumber] = React.useState(readIntro ? 1 : 0)

  // pop-ups
  const [eraseMenu, setEraseMenu] = React.useState(false)
  const [impressum, setImpressum] = React.useState(false)
  const [privacy, setPrivacy] = React.useState(false)
  const [info, setInfo] = React.useState(false)
  const [rulesHelp, setRulesHelp] = React.useState(false)
  const [uploadMenu, setUploadMenu] = React.useState(false)
  const [preferencesPopup, setPreferencesPopup] = React.useState(false)

  function closeEraseMenu()   {setEraseMenu(false)}
  function closeImpressum()   {setImpressum(false)}
  function closePrivacy()   {setPrivacy(false)}
  function closeInfo()        {setInfo(false)}
  function closeRulesHelp()   {setRulesHelp(false)}
  function closeUploadMenu()  {setUploadMenu(false)}
  function closePreferencesPopup() {setPreferencesPopup(false)}
  function toggleEraseMenu()  {setEraseMenu(!eraseMenu)}
  function toggleImpressum()  {setImpressum(!impressum)}
  function togglePrivacy()  {setPrivacy(!privacy)}
  function toggleInfo()       {setInfo(!info)}
  function toggleUploadMenu() {setUploadMenu(!uploadMenu)}
  function togglePreferencesPopup() {setPreferencesPopup(!preferencesPopup)}

  // set the window title
  useEffect(() => {
    if (gameInfo.data?.title) {
      window.document.title = gameInfo.data.title
    }
  }, [gameInfo.data?.title])

  return gameInfo.isLoading ?
    <Box display="flex" alignItems="center" justifyContent="center" sx={{ height: "calc(100vh - 64px)" }}>
      <CircularProgress />
    </Box>
  : <>
    {/* <WelcomeAppBar pageNumber={page} setPageNumber={setPage} gameInfo={gameInfo.data} toggleImpressum={toggleImpressum} togglePrivacy={togglePrivacy}
      toggleEraseMenu={toggleEraseMenu} toggleUploadMenu={toggleUploadMenu}
      toggleInfo={toggleInfo} togglePreferencesPopup={togglePreferencesPopup}/> */}
    <div className="app-content">
      { mobile ?
          <div className="welcome mobile">
            {(page == 0 ?
              <IntroductionPanel introduction={gameInfo.data?.introduction} setPageNumber={setPage} />
            : page == 1 ?
              <WorldTreePanel worlds={gameInfo.data?.worlds} worldSize={gameInfo.data?.worldSize}
                rulesHelp={rulesHelp} setRulesHelp={setRulesHelp} />
            :
              <InventoryPanel />
            )}
          </div>
        :
          <Split className="welcome" minSize={0} snapOffset={200}  sizes={[25, 50, 25]}>
            <IntroductionPanel introduction={gameInfo.data?.introduction} setPageNumber={setPage} />
            <WorldTreePanel worlds={gameInfo.data?.worlds} worldSize={gameInfo.data?.worldSize}
              rulesHelp={rulesHelp} setRulesHelp={setRulesHelp} />
            <InventoryPanel />
          </Split>
      }
    </div>
  </>
}

export default Welcome
