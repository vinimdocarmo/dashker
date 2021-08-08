import React, { useCallback, useState } from "react";
import cls from "classnames";
import { HiPlay, HiStop, HiTrash } from "react-icons/hi";
import { ContainerLogs } from "./ContainerLogs";

type ContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  onRunClick: (id: string) => void;
  onStopClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
};

export function Container({
  id,
  name,
  image,
  status,
  state,
  onRunClick,
  onStopClick,
  onRemoveClick,
}: ContainerProps) {
  const nop = () => {};
  const [showLogs, setShowLogs] = useState(false);
  const isRunning = useCallback(() => state === "running", [state]);
  const isCreated = useCallback(() => state === "created", [state]);
  const isExited = useCallback(() => state === "exited", [state]);

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
              onClick={() => {
                setShowLogs(true);
              }}
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

        <div className="flex space-x-1">
          <button onClick={!isRunning() ? () => onRunClick(id) : nop}>
            <HiPlay
              size="30"
              className={cls({
                "text-gray-400": isRunning(),
                "text-gray-900": !isRunning(),
              })}
            />
          </button>
          <button onClick={isRunning() ? () => onStopClick(id) : nop}>
            <HiStop
              size="30"
              className={cls({
                "text-gray-400": !isRunning(),
                "text-gray-900": isRunning(),
              })}
            />
          </button>
          <button onClick={() => onRemoveClick(id)}>
            <HiTrash size="30" className="text-gray-900" />
          </button>
        </div>
      </div>

      {showLogs && (
        <ContainerLogs containerId={id} onClose={() => setShowLogs(false)} />
      )}
    </div>
  );
}
