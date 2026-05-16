import { Slider } from "@/components/ui/slider";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StudioControlsDialog(props: any){
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Orb Settings</DialogTitle>
      </DialogHeader>
      {props.children}
    </DialogContent>
  );
}
