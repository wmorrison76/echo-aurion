import { useEffect } from 'react'
import { listFonts, ensureLoaded } from '../engine/text'

export function useFontLoader(){
  useEffect(()=>{
    const f = async () => {
      for (const ff of listFonts()){
        if (ff.status !== 'loaded' && ff.name) await ensureLoaded(ff.name)
      }
    }
    f()
  }, [])
}

export default useFontLoader;
