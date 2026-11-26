// Modern HTML <dialog> progressive enhancement & cross-browser fallbacks
// Follows modern-web-guidance for `dialog`, `light-dismiss-a-dialog`, and `animate-to-from-top-layer`

let supportsDisplayTransition;

function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay();
}

export async function closeDialogSmoothly(dialog, returnValue = "") {
  if (!dialog?.open) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute("data-closing", "");
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 600)),
      ]);
    }
    if (!dialog.hasAttribute("data-closing")) return;
    dialog.removeAttribute("data-closing");
  }
  dialog.close(returnValue);
}

export function enhanceModalDialog(dialog) {
  if (!dialog) return;

  // 1. Reset returnValue on close so stale values never leak
  dialog.addEventListener("close", () => {
    dialog.returnValue = "";
  });

  // 2. Smooth exit animation fallback for browsers lacking overlay/discrete display transition
  dialog.addEventListener("cancel", (event) => {
    if (!supportsTopLayerExit()) {
      event.preventDefault();
      closeDialogSmoothly(dialog);
    }
  });

  // 3. Light-dismiss fallback for browsers without native `closedby="any"` (e.g., Safari)
  if (!("closedBy" in HTMLDialogElement.prototype) && dialog.getAttribute("closedby") === "any") {
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener("pointerdown", (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener("pointerup", (e) => {
      if (pressedOutside && isOutside(e)) {
        closeDialogSmoothly(dialog);
      }
      pressedOutside = false;
    });
  }
}
