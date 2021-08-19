import React, { useCallback, useState } from "react";
import cls from "classnames";
import {
  HiChip,
  HiPlay,
  HiRefresh,
  HiStop,
  HiTerminal,
  HiTrash,
} from "react-icons/hi";
import { ContainerLogs } from "./ContainerLogs";
import { ClipLoader } from "react-spinners";
import { ContainerTerminal } from "./ContainerTerminal";

type ContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  stats?: { cpuUsage?: number };
  loadingState?: "stoping" | "starting" | "removing" | "default" | "restarting";
  onStartClick: (id: string) => void;
  onStopClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  onRestartClick: (id: string) => void;
};

export function Container({
  id,
  name,
  image,
  status,
  state,
  loadingState = "default",
  onStartClick,
  onStopClick,
  onRemoveClick,
  onRestartClick,
  stats = {},
}: ContainerProps) {
  const nop = () => {};
  const [showLogs, setShowLogs] = useState(false);
  const [openTerminal, setOpenTerminal] = useState(false);
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
            {/* Container name and image name */}
            <div
              className=" text-lg font-medium text-black"
              onClick={() => {
                setShowLogs(true);
              }}
            >
              <span>{image}</span>
              <span className="ml-1 text-xs text-gray-500">{name}</span>
            </div>

            {/* Container Stats  */}
            {stats.cpuUsage !== undefined && (
              <div
                className={cls("flex items-center space-x-1", {
                  "text-blue-500": stats.cpuUsage >= 0 && stats.cpuUsage < 40,
                  "text-yellow-500":
                    stats.cpuUsage >= 40 && stats.cpuUsage < 70,
                  "text-red-500": stats.cpuUsage >= 70,
                })}
              >
                <HiChip /> <span>{stats.cpuUsage?.toFixed(2) + "%"}</span>
              </div>
            )}

            {/* Container Status */}
            <p className="text-gray-500" title={id}>
              {id.slice(0, 10)} <span>&#8226; </span>
              <span className="text-xs">{status}</span>
            </p>
          </div>
        </div>

        {/* Container actions */}
        <div className="flex space-x-1">
          <button
            onClick={
              isRunning() && loadingState === "default"
                ? () => setOpenTerminal((old) => !old)
                : nop
            }
          >
            <HiTerminal
              size="30"
              className={cls({
                "text-gray-400": !isRunning(),
                "text-gray-900": isRunning(),
              })}
            />
          </button>
          {loadingState === "starting" ? (
            <ClipLoader size="25px" />
          ) : (
            <button
              onClick={
                !isRunning() && loadingState === "default"
                  ? () => onStartClick(id)
                  : nop
              }
              className={cls({ "cursor-not-allowed": isRunning() })}
            >
              <HiPlay
                size="30"
                className={cls({
                  "text-gray-400": isRunning(),
                  "text-gray-900": !isRunning(),
                })}
              />
            </button>
          )}
          {loadingState === "stoping" ? (
            <ClipLoader size="25px" />
          ) : (
            <button
              onClick={
                isRunning() && loadingState === "default"
                  ? () => onStopClick(id)
                  : nop
              }
              className={cls({ "cursor-not-allowed": !isRunning() })}
            >
              <HiStop
                size="30"
                className={cls({
                  "text-gray-400": !isRunning(),
                  "text-gray-900": isRunning(),
                })}
              />
            </button>
          )}
          {loadingState === "restarting" ? (
            <ClipLoader size="25px" />
          ) : (
            <button
              onClick={
                loadingState === "default" ? () => onRestartClick(id) : nop
              }
            >
              <HiRefresh size="30" className="text-gray-900" />
            </button>
          )}
          {loadingState === "removing" ? (
            <ClipLoader size="25px" />
          ) : (
            <button
              onClick={
                loadingState === "default" ? () => onRemoveClick(id) : nop
              }
            >
              <HiTrash size="30" className="text-gray-900" />
            </button>
          )}
        </div>
      </div>

      {openTerminal && <ContainerTerminal containerId={id} className="mt-3" />}

      {showLogs && (
        <ContainerLogs
          className="mt-3"
          containerId={id}
          onClose={() => setShowLogs(false)}
        />
      )}
    </div>
  );
}
