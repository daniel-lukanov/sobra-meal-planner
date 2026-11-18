import { usePendingChoice } from "@/lib/household-sync";
import { Button } from "./ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shown after login when this device and the account both hold data: the person picks which to keep. */
export function SyncChoice() {
  const { pending, choose } = usePendingChoice();
  const items = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <Dialog open={!!pending} onOpenChange={() => { /* a choice is required */ }}>
      <DialogContent className="max-w-md" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Which data do you want to keep?</DialogTitle>
          <DialogDescription>Both this device and your account already hold your settings, fridge and plan. Pick one. The other one is replaced.</DialogDescription>
        </DialogHeader>
        {pending && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] bg-sheet-2 p-3 text-[13.5px]">
              <p className="font-semibold">Your account</p>
              <p className="mt-1 text-muted-foreground">{items(pending.remote.fridgeItems, "fridge item", "fridge items")}<br />{pending.remote.stores.length ? pending.remote.stores.join(", ") : "No stores saved"}<br />{items(pending.remote.allergens, "allergy", "allergies")}</p>
              <Button className="mt-3 w-full" onClick={() => choose("account")}>Keep my account's data</Button>
            </div>
            <div className="rounded-[8px] bg-sheet-2 p-3 text-[13.5px]">
              <p className="font-semibold">This device</p>
              <p className="mt-1 text-muted-foreground">{items(pending.local.fridge, "fridge item", "fridge items")}<br />{pending.local.stores.join(", ")}<br />{items(pending.local.allergens, "allergy", "allergies")}</p>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => choose("device")}>Keep this device's data</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
