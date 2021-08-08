package main

import (
	"bufio"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type ContainerListFilters struct {
	ID string
}

type LogMessage struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

func getContainers() ([]types.Container, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		return nil, err
	}

	return cli.ContainerList(context.Background(), types.ContainerListOptions{All: true})
}

func starContainer(id string) error {
	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		return err
	}

	err = cli.ContainerStart(context.Background(), id, types.ContainerStartOptions{})

	if err != nil {
		return err
	}

	return nil
}

func stopContainer(id string) error {
	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		return err
	}

	err = cli.ContainerStop(context.Background(), id, nil)

	if err != nil {
		return err
	}

	return nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		for _, origin := range r.Header["Origin"] {
			if origin == "http://localhost:3000" {
				return true
			}
		}
		return false
	},
}

func socketHandler(id string, w http.ResponseWriter, r *http.Request) {
	// Upgrade our raw HTTP connection to a websocket based one
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Print("Error during connection upgradation:", err)
		return
	}

	defer conn.Close()

	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		fmt.Println("Error creating new docker client: ", err)
		return
	}

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

func main() {
	r := gin.Default()

	// - No origin allowed by default
	// - GET,POST, PUT, HEAD methods
	// - Credentials share disabled
	// - Preflight requests cached for 12 hours
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}

	r.Use(cors.New(config))

	r.GET("ws/container/:id/logs", func(c *gin.Context) {
		id := c.Params.ByName("id")
		socketHandler(id, c.Writer, c.Request)
	})
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	r.GET("/container", func(c *gin.Context) {
		containers, err := getContainers()

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(200, containers)
	})
	r.GET("/container/:id/start", func(c *gin.Context) {
		id := c.Params.ByName("id")

		err := starContainer(id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}
	})
	r.GET("/container/:id/stop", func(c *gin.Context) {
		id := c.Params.ByName("id")

		err := stopContainer(id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}
	})

	r.Run(":3001") // listen and serve on 0.0.0.0:8080
}
