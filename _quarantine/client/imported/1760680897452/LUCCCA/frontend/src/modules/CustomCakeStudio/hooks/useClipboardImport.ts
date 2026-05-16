import { useEffect } from 'react'
import { ImageImporter } from '../engine/assets/ImageImporter'

export function useClipboardImport(){
  useEffect(()=>{
    const onPaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const items = e.clipboardData.items
      for (let i=0;i<items.length;i++){
        const it = items[i]
        if (it.kind === 'file'){
          const file = it.getAsFile()
          if (file && file.type.startsWith('image/')){
            e.preventDefault()
            await ImageImporter.importFile(file)
            return
          }
        }
        if (it.kind === 'string' && it.type === 'text/plain'){
          const text = await new Promise<string>(res=> it.getAsString(res))
          const urlish = text.trim()
          if (/^https?:\/\//i.test(urlish) && /(\.png|\.jpe?g|\.webp|\.gif)(\?|$)/i.test(urlish)){
            e.preventDefault()
            await ImageImporter.importUrl(urlish)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste as any)
    return ()=> window.removeEventListener('paste', onPaste as any)
  }, [])
}

export default useClipboardImport;
