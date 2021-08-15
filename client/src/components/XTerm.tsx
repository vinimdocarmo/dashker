import React, { useEffect } from "react";
import { useRef } from "react";
import { forwardRef } from "react";
import { Terminal, ITerminalAddon } from "xterm";

import "xterm/css/xterm.css";

interface XTermProps {
  addons?: Array<ITerminalAddon>;
  className?: string;
}

const XTerm: React.ForwardRefExoticComponent<
  XTermProps & React.RefAttributes<any>
> = forwardRef(({ addons, className }: XTermProps, ref: any) => {
  const terminalRef = useRef(new Terminal());

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const terminal = terminalRef.current;

    terminal.open(ref.current);

    return () => {
      terminal.dispose();
    };
  }, [ref]);

  useEffect(() => {
    addons?.forEach((addon) => terminalRef.current.loadAddon(addon));

    return () => {
      addons?.forEach((addon) => addon.dispose());
    };
  }, [addons]);

  return <div ref={ref} className={className} />;
});

export default XTerm;
