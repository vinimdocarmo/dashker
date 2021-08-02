import React from "react";

type ContainerProps = {
  id: string;
  name: string;
};

export function Container({ id, name }: ContainerProps) {
  return (
    <div
      key={id}
      className="p-6 max-w-sm bg-white rounded-xl shadow-md flex items-center space-x-4 mt-2 first:mt-0"
    >
      <div className="flex-shrink-0">
        <img
          className="h-12 w-12"
          src="/docker-icon.jpeg"
          alt="ChitChat Logo"
        />
      </div>
      <div>
        <div className=" text-lg font-medium text-black">{name}</div>
        <p className="text-gray-500">{id.slice(0, 10)}</p>
      </div>
    </div>
  );
}
