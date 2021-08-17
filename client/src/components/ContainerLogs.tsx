import React, { useEffect, useRef, useState } from "react";
import cls from "classnames";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { HiSearch, HiX } from "react-icons/hi";
import { useDebounce } from "../hooks/useDebounce";

export const ContainerLogs: React.FC<{
  containerId: string;
  className: string;
  onClose?: () => void;
}> = ({ className, containerId, onClose = () => {} }) => {
  const logBottomEl = useRef<HTMLDivElement>(null);
  const logTerminalEl = useRef<HTMLDivElement>(null);
  const [socketOpen, setSocketOpen] = useState(true);
  const [searchQuery, setSearchQUery] = useState("");
  const debouncedSearchQuery = useDebounce<string>(searchQuery, 500);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [filteredLogs, setFilteredLogs] = useState<
    { message: string; timestamp: string; id: string }[]
  >([]);
  const [logs, setLogs] = useState<
    { message: string; timestamp: string; id: string }[]
  >([]);

  const { lastJsonMessage, readyState } = useWebSocket(
    `ws://localhost:3001/ws/container/${containerId}/logs`,
    {
      onClose: () =>
        console.warn("connection closed for container ", containerId),
      onOpen: () => {
        console.info("connection opened for container ", containerId);
      },
      shouldReconnect: () => true, // TODO: reconnect, but don't duplicate logs
      reconnectInterval: 500,
    },
    socketOpen // TODO: I don't think this is working properly
  );

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    setLogs((oldLogsLineHistory) => {
      return oldLogsLineHistory
        ? [...oldLogsLineHistory, lastJsonMessage]
        : [lastJsonMessage];
    });
  }, [lastJsonMessage]);

  // Scroll terminal to bottom as soon as new logs arrive
  useEffect(() => {
    if (logs && logs.length > 0 && stickToBottom) {
      logTerminalEl.current?.scrollTo({ top: logBottomEl.current?.offsetTop });
    }
  }, [logs, stickToBottom]);

  // Search for logs
  useEffect(() => {
    if (debouncedSearchQuery) {
      const filterdLogs = logs.filter((log) => {
        const index = log.message
          .toLowerCase()
          .indexOf(debouncedSearchQuery.toLowerCase());

        return index >= 0;
      });

      setFilteredLogs(filterdLogs);
    } else {
      setFilteredLogs([]);
    }
  }, [debouncedSearchQuery, logs]);

  return (
    <div className={className}>
      <div className="resize-y bg-gray-900 p-2 font-mono text-xs relative">
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
            setLogs([]);
            onClose();
          }}
        >
          <HiX size="15px" color="#FFF" />
        </button>
        <div
          ref={logTerminalEl}
          className="min-h-60 h-80 text-green-500 flex flex-col overflow-y-auto"
        >
          {logs.length === 0
            ? "[Empty log]"
            : (filteredLogs.length > 0 ? filteredLogs : logs).map((log, i) => (
                <div
                  key={log.id}
                  ref={i === logs.length - 1 ? logBottomEl : null} // set ref of the last message element
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
            value={searchQuery}
            onChange={(ev) => setSearchQUery(ev.target.value)}
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
