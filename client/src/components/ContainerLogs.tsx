import React, { useEffect, useRef, useState } from "react";
import cls from "classnames";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { HiSearch, HiX } from "react-icons/hi";

export const ContainerLogs: React.FC<{
  containerId: string;
  onClose?: () => void;
}> = ({ containerId, onClose = () => {} }) => {
  const logBottomEl = useRef<HTMLDivElement>(null);
  const logTerminalEl = useRef<HTMLDivElement>(null);
  const [socketOpen, setSocketOpen] = useState(true);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [logsHistory, setLogsLineHisoty] = useState<
    { message: string; timestamp: string }[] | null
  >(null);

  const { lastJsonMessage, readyState } = useWebSocket(
    `ws://localhost:3001/ws/container/${containerId}/logs`,
    {
      onClose: () =>
        console.warn("connection closed for container ", containerId),
      onOpen: () => {
        console.info("connection opened for container ", containerId);
      },
      onMessage: () => console.debug("new message"),
      // shouldReconnect: () => true // TODO: implement reconnect, but pass last timestamp as argument
    },
    socketOpen // TODO: I don't think this is working properly
  );

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    setLogsLineHisoty((oldLogsLineHistory) => {
      return oldLogsLineHistory
        ? [...oldLogsLineHistory, lastJsonMessage]
        : [lastJsonMessage];
    });
  }, [lastJsonMessage]);

  // Scroll terminal to bottom as soon as new logs arrive
  useEffect(() => {
    if (logsHistory && logsHistory.length > 0 && stickToBottom) {
      logTerminalEl.current?.scrollTo({ top: logBottomEl.current?.offsetTop });
    }
  }, [logsHistory, stickToBottom]);
  return (
    <div>
      <div className="resize-y bg-gray-900 p-2 mt-3 font-mono text-xs relative">
        <span
          className="flex h-3 w-3 absolute -top-1.5 -left-1.5"
          title="Streaming logs"
          onClick={() => setSocketOpen(false)}
        >
          <span
            className={cls(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              {
                "bg-green-400": readyState === ReadyState.OPEN,
                "bg-red-400": readyState === ReadyState.CLOSED,
                "bg-blue-400":
                  readyState !== ReadyState.OPEN &&
                  readyState !== ReadyState.CLOSED,
              }
            )}
          ></span>
          <span
            className={cls("relative inline-flex rounded-full h-3 w-3", {
              "bg-green-500": readyState === ReadyState.OPEN,
              "bg-red-500": readyState === ReadyState.CLOSED,
              "bg-blue-500":
                readyState !== ReadyState.OPEN &&
                readyState !== ReadyState.CLOSED,
            })}
          ></span>
        </span>
        <button
          className="absolute top-2 right-2"
          onClick={() => {
            setSocketOpen(true);
            setLogsLineHisoty([]);
            onClose();
          }}
        >
          <HiX size="15px" color="#FFF" />
        </button>
        <div
          ref={logTerminalEl}
          className="min-h-60 h-80 text-green-500 flex flex-col overflow-y-auto"
        >
          {logsHistory === null
            ? "[Empty log]"
            : logsHistory.map((log, i) => (
                <div
                  key={log.timestamp}
                  ref={i === logsHistory.length - 1 ? logBottomEl : null} // set ref of the last message element
                >
                  {log.message}
                </div>
              ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-gray-800 text-gray-400 py-2 px-3">
        <div className="flex items-center">
          <HiSearch size="20" className="text-gray-400 mr-1" />
          <input
            type="text"
            placeholder="Search..."
            className="w-96 appearance-none bg-gray-800 border-none py-1 px-2 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="flex items-center space-x-1">
          <input
            type="checkbox"
            id="sticky"
            name="sticky"
            checked={stickToBottom}
            className="mr-1 text-indigo-500 w-4 h-4 focus:ring-indigo-400 focus:ring-opacity-25 border border-gray-300 rounded"
            onChange={(ev) => setStickToBottom(ev.target.checked)}
          />
          <label htmlFor="sticky">Stick to bottom</label>
        </div>
      </div>
    </div>
  );
};
