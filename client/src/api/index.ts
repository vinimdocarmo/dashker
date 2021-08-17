import { DockerContainer } from "./types/container.type";

const apiHost = "http://localhost:3001";

const createURL = (url: string): string => {
  const newURL = new URL(url, apiHost);
  return newURL.toString();
};

export const startContainer = async (id: string): Promise<void> => {
  return fetch(createURL(`/container/${id}/start`), { method: "PUT" }).then(
    (res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to start container");
      }
    }
  );
};

export const removeContainer = async (id: string): Promise<void> => {
  return fetch(createURL(`/container/${id}/remove`), { method: "PUT" }).then(
    (res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to remove container");
      }
    }
  );
};

export const restartContainer = async (id: string): Promise<void> => {
  return fetch(createURL(`/container/${id}/restart`), { method: "PUT" }).then(
    (res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to remove container");
      }
    }
  );
};

export const stopContainer = async (id: string): Promise<void> => {
  return fetch(createURL(`/container/${id}/stop`), { method: "PUT" }).then(
    (res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to start container");
      }
    }
  );
};

export const getContainers = async (): Promise<DockerContainer[]> => {
  return fetch(createURL("/container"))
    .then((res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to fetch containers");
      }

      return res.json();
    })
    .then((data) =>
      data.map((container: any) => ({
        name: container.Names[0],
        image: container.Image,
        id: container.Id,
        status: container.Status,
        state: container.State,
      }))
    );
};

export const getContainer = async (
  containerId: string
): Promise<DockerContainer> => {
  return fetch(createURL(`/container/${containerId}`))
    .then(async (res) => {
      if (res.status !== 200) {
        throw new Error("Error trying to fetch container " + containerId);
      }

      return await res.json();
    })
    .then((container) => ({
      name: container.Names[0],
      image: container.Image,
      id: container.Id,
      status: container.Status,
      state: container.State,
    }));
};
