import React, { useCallback, useEffect, useState } from "react";
import cls from "classnames";
import { PlayIcon } from "./icons/PlayIcon";
import { PauseIcon } from "./icons/PauseIcon";

type ContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  onRunClick: (id: string) => void;
  onStopClick: (id: string) => void;
};

export function Container({
  id,
  name,
  image,
  status,
  state,
  onRunClick,
  onStopClick,
}: ContainerProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const nop = () => {};
  const isRunning = useCallback(() => state === "running", [state]);
  const isCreated = useCallback(() => state === "created", [state]);
  const isExited = useCallback(() => state === "exited", [state]);

  useEffect(() => {
    if (!showLogs) {
      return;
    }

    const conn = new WebSocket("ws://localhost:3001/ws");

    conn.onclose = function () {
      console.log("connection closed");
    };
    conn.onopen = () => {
      console.log("websocket opened for container id: ", id);
      conn.send(id);
    };

    conn.onerror = (error) => {
      console.error("error: ", error);
    };

    conn.onmessage = async function (evt) {
      setLogs((lastLogs) => {
        if (lastLogs.length > 1000) { // reset logs array
          return evt.data.split("\n");
        } else {
          return [...lastLogs, ...evt.data.split("\n")];
        }
      });
    };

    return () => {
      conn.close();
    };
  }, [id, showLogs]);

  return (
    <div
      key={id}
      className={cls(
        "p-6 bg-white rounded-md shadow-md mt-2 first:mt-0 border-l-8",
        {
          "border-green-600": isRunning(),
          "border-red-600": isCreated(),
          "border-gray-600": isExited(),
        }
      )}
    >
      <div className="flex items-center space-x-4 justify-between">
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <img
              className="h-12 w-12"
              src="/docker-icon.jpeg"
              alt="Container Logo"
            />
          </div>
          <div>
            <div
              className=" text-lg font-medium text-black"
              onClick={() => setShowLogs(true)}
            >
              <span>{image}</span>
              <span className="ml-1 text-xs text-gray-500">{name}</span>
            </div>
            <p className="text-gray-500" title={id}>
              {id.slice(0, 10)} <span>&#8226; </span>
              <span className="text-xs">{status}</span>
            </p>
          </div>
        </div>

        <div className="flex">
          <PlayIcon
            size="30"
            className={cls("mr-2", {
              "text-gray-400": isRunning(),
              "cursor-pointer text-gray-900": !isRunning(),
            })}
            onClick={!isRunning() ? () => onRunClick(id) : nop}
          />
          {/* TODO: change pause icon to stop icon */}
          <PauseIcon
            size="30"
            className={cls({
              "text-gray-400": !isRunning(),
              "cursor-pointer text-gray-900": isRunning(),
            })}
            onClick={isRunning() ? () => onStopClick(id) : nop}
          />
        </div>
      </div>

      {showLogs && (
        <div className="resize-y bg-gray-900 border-2 border-gray-500 p-2 mt-3 font-mono text-xs relative">
          <span className="flex h-3 w-3 absolute -top-1.5 -left-1.5" title="Streaming logs">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span
            className="text-white underline hover:cursor-pointer absolute top-1 right-2"
            onClick={() => setShowLogs(false)}
          >
            {/* TODO:  */}
            close
          </span>
          <div className="min-h-60 h-80 text-green-500 flex flex-col-reverse overflow-y-auto  ">
            {logs.length === 0
              ? "Fetching logs..."
              : logs.reverse().map((log) => (
                  // TODO: add key
                  <span className="block">{log}</span>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
