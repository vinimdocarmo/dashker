package main

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gorilla/websocket"
)

type ContainerListFilters struct {
	ID string
}

func getContainers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{All: true})
	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	err = json.NewEncoder(w).Encode(containers)
	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

func handleContainerSubRoutes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if matched, err := regexp.MatchString(`^\/container\/[[:alnum:]]+\/start$`, r.URL.Path); err == nil && matched {
		re := regexp.MustCompile(`\/container\/(?P<id>[[:alnum:]]+)\/start`)
		id := re.FindStringSubmatch(r.URL.Path)[1]

		cli, err := client.NewClientWithOpts(client.FromEnv)

		if err != nil {
			http.Error(w, "", http.StatusInternalServerError)
			return
		}

		err = cli.ContainerStart(context.Background(), id, types.ContainerStartOptions{})

		if err != nil {
			fmt.Println(err)
			http.Error(w, "", http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w)
		return
	} else if matched, err := regexp.MatchString(`^\/container\/[[:alnum:]]+\/stop$`, r.URL.Path); err == nil && matched {
		re := regexp.MustCompile(`\/container\/(?P<id>[[:alnum:]]+)\/stop`)
		id := re.FindStringSubmatch(r.URL.Path)[1]

		cli, err := client.NewClientWithOpts(client.FromEnv)

		if err != nil {
			http.Error(w, "", http.StatusInternalServerError)
			return
		}

		err = cli.ContainerStop(context.Background(), id, nil)

		if err != nil {
			fmt.Println(err)
			http.Error(w, "", http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w)
		return
	} else {
		http.Error(w, "", http.StatusNotFound)
		return
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
} // use default options

func socketHandler(w http.ResponseWriter, r *http.Request) {
	// Upgrade our raw HTTP connection to a websocket based one
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Print("Error during connection upgradation:", err)
		return
	}

	defer conn.Close()

	_, buff, err := conn.ReadMessage()

	if err != nil {
		fmt.Println("Error reading message from socket: ", err)
		return
	}

	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		fmt.Println("Error creating new docker client: ", err)
		return
	}

	id := string(buff)
	reader, err := cli.ContainerLogs(context.Background(), id, types.ContainerLogsOptions{Tail: "100", Follow: true, ShowStdout: true, ShowStderr: true, Timestamps: true})

	if err != nil {
		fmt.Println("Error fetching container logs: ", err)
		return
	}

	defer reader.Close()

	container, err := cli.ContainerInspect(context.Background(), id)

	if err != nil {
		fmt.Println("Error inspecting container: ", err)
		return
	}

	isTty := container.Config.Tty

	if !isTty {
		for {
			header := make([]byte, 8)

			n, err := reader.Read(header)

			if err != nil || n != 8 {
				if err == io.EOF {
					fmt.Println("EOF reading header")
					break
				}
				fmt.Println("Error during header reading:", err)
				break
			}

			output := make([]byte, binary.BigEndian.Uint32(header[4:]))
			n, err = reader.Read(output)

			if err != nil {
				if err == io.EOF {
					fmt.Println("EOF reading output")
					break
				}
				fmt.Println("Error during output reading:", err)
				break
			}

			err = conn.WriteMessage(websocket.TextMessage, output[:n])

			if err != nil {
				fmt.Println("Error during message writing:", err)
				break
			}

			fmt.Println("write message non-TTY")
		}
	} else {
		for {
			output := make([]byte, 500000)
			n, err := reader.Read(output)

			if err != nil {
				if err == io.EOF {
					fmt.Println("EOF reading output")
					break
				}
				fmt.Println("Error during output reading:", err)
				break
			}

			err = conn.WriteMessage(websocket.TextMessage, output[:n])

			if err != nil {
				fmt.Println("Error during message writing:", err)
				break
			}

			fmt.Println("write message non-TTY")
		}
	}
}

func handleRequests() {
	http.HandleFunc("/ws", socketHandler)
	http.HandleFunc("/container", getContainers)
	http.HandleFunc("/container/", handleContainerSubRoutes)
	log.Fatal(http.ListenAndServe(":3001", nil))
}

func main() {
	handleRequests()
}
