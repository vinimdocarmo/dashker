import React, { useCallback } from "react";
import cls from "classnames";
import { PlayIcon } from "./icons/PlayIcon";
import { PauseIcon } from "./icons/PauseIcon";

type ContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  onRunClick: (id: string) => void,
  onStopClick: (id: string) => void,
};

export function Container({ id, name, image, status, state, onRunClick, onStopClick }: ContainerProps) {
  const nop = () => {};
  const isRunning = useCallback(() => state === "running", [state]);
  const isCreated = useCallback(() => state === "created", [state]);
  const isExited = useCallback(() => state === "exited", [state]);

  return (
    <div
      key={id}
      className={cls(
        "p-6 bg-white max-w-xl rounded-md shadow-md flex items-center mt-2 first:mt-0 border-l-8 space-x-4 justify-between",
        {
          "border-green-600": isRunning(),
          "border-red-600": isCreated(),
          "border-gray-600": isExited(),
        }
      )}
    >
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-12 w-12"
            src="/docker-icon.jpeg"
            alt="ChitChat Logo"
          />
        </div>
        <div>
          <div className=" text-lg font-medium text-black">
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
  );
}
