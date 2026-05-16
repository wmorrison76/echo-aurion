import React from 'react';
import Toolbar from './Toolbar';
import PanelHost from './panelHost/PanelHost';
import usePanels from '../state/usePanels';
import '../styles/global.css';
export default function Board(){
  const { panels=[] } = (typeof usePanels === 'function' ? usePanels() : {panels:[]});
  return (
    <div id="whiteboard-stage" className="wb-stage">
      <div className="wb-left-rule" aria-hidden="true" />
      <Toolbar />
      <main className="wb-main">
        <PanelHost panels={panels}/>
      </main>
    </div>
  );
}
