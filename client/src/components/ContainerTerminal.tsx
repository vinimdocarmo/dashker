import React, { useEffect, useRef, useState } from "react";
import { HiX } from "react-icons/hi";
import { ITerminalAddon } from "xterm";
import cls from "classnames";
import { AttachAddon } from "xterm-addon-attach";

import XTerm from "./XTerm";

interface ContainerTerminalProps {
  containerId: string;
  className: string;
}

export const ContainerTerminal: React.FC<ContainerTerminalProps> = ({
  containerId,
  className,
}: ContainerTerminalProps) => {
  const xtermRef = useRef<any>(null);
  const [addons, setAddons] = useState<ITerminalAddon[]>();

  useEffect(() => {
    if (!containerId) {
      return;
    }

    const socket = new WebSocket(
      `ws://localhost:3001/ws/container/${containerId}/terminal`
    );
    const attachAddon = new AttachAddon(socket);

    setAddons([attachAddon]);

    return () => {
      attachAddon.dispose();
      socket.close();
    };
  }, [containerId]);

  return (
    <div className={cls("relative", className)}>
      <XTerm ref={xtermRef} addons={addons} />
    </div>
  );
};
