package main

import (
	"bufio"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gorilla/websocket"
)

type ContainerListFilters struct {
	ID string
}

type LogMessage struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
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

	if !container.Config.Tty {
		fmt.Println("container is NOT attached to TTY")

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

			timestamp := make([]byte, 31) // 30 bytes for timestamp and 1 for the following space

			n, err = reader.Read(timestamp)

			if err != nil || n != 31 {
				if err == io.EOF {
					fmt.Println("EOF reading timestamp")
					break
				}
				fmt.Println("Error during timestamp reading:", err)
				break
			}

			outputSize := binary.BigEndian.Uint32(header[4:])
			output := make([]byte, outputSize-uint32(n)) // makes sure to remove size of timestamp read
			n, err = reader.Read(output)

			if err != nil {
				if err == io.EOF {
					fmt.Println("EOF reading output")
					break
				}
				fmt.Println("Error during output reading:", err)
				break
			}

			logMessage := LogMessage{
				Message:   string(output[:n]),
				Timestamp: string(timestamp),
			}

			bytes, err := json.Marshal(logMessage)

			if err != nil {
				fmt.Println("Error marshaling json: ", err)
				break
			}

			err = conn.WriteMessage(websocket.TextMessage, bytes)

			if err != nil {
				fmt.Println("Error during message writing:", err)
				break
			}
		}
	} else {
		fmt.Println("container is attached to TTY")

		scanner := bufio.NewScanner(reader)

		logLines := []*LogMessage{}

		for scanner.Scan() {
			textSplitted := strings.SplitN(scanner.Text(), " ", 2)
			logLine := new(LogMessage)
			logLine.Timestamp, logLine.Message = textSplitted[0], textSplitted[1]

			logLines = append(logLines, logLine)
		}

		if err := scanner.Err(); err != nil {
			fmt.Fprintln(os.Stderr, "error reading raeder: ", err)
			return
		}

		for _, log := range logLines {
			bytes, err := json.Marshal(log)

			if err != nil {
				fmt.Println("Error marshaling json: ", err)
				break
			}

			err = conn.WriteMessage(websocket.TextMessage, bytes)

			if err != nil {
				fmt.Println("Error during message writing:", err)
				break
			}
		}
	}
}

func handleRequests() {
	http.HandleFunc("/ws/container/logs", socketHandler)
	http.HandleFunc("/container", getContainers)
	http.HandleFunc("/container/", handleContainerSubRoutes)
	log.Fatal(http.ListenAndServe(":3001", nil))
}

func main() {
	handleRequests()
}
