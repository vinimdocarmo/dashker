package controller

import (
	"bufio"
	"context"
	"encoding/binary"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type LogMessage struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
	Id        string `json:"id"`
}

type ContainerController struct {
	DockerClient *client.Client
}

func (ctrl *ContainerController) Remove(c *gin.Context) {
	id := c.Params.ByName("id")
	err := ctrl.DockerClient.ContainerRemove(c.Request.Context(), id, types.ContainerRemoveOptions{Force: true})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Writer.WriteHeader(http.StatusOK)
}

func (ctrl *ContainerController) Start(c *gin.Context) {
	id := c.Params.ByName("id")
	err := ctrl.DockerClient.ContainerStart(c.Request.Context(), id, types.ContainerStartOptions{})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Writer.WriteHeader(http.StatusOK)
}

func (ctrl *ContainerController) Stop(c *gin.Context) {
	id := c.Params.ByName("id")
	err := ctrl.DockerClient.ContainerStop(c.Request.Context(), id, nil)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Writer.WriteHeader(http.StatusOK)
}

func (ctrl *ContainerController) Restart(c *gin.Context) {
	id := c.Params.ByName("id")
	err := ctrl.DockerClient.ContainerRestart(c.Request.Context(), id, nil)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Writer.WriteHeader(http.StatusOK)
}

func (ctrl *ContainerController) List(c *gin.Context) {
	containers, err := ctrl.DockerClient.ContainerList(c.Request.Context(), types.ContainerListOptions{All: true})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, containers)
}

func (ctrl *ContainerController) Get(c *gin.Context) {
	id := c.Params.ByName("id")

	filters := filters.NewArgs()
	filters.Add("id", id)

	containers, err := ctrl.DockerClient.ContainerList(c.Request.Context(), types.ContainerListOptions{All: true, Filters: filters})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(containers) == 0 {
		c.JSON(http.StatusNotFound, gin.H{})
		return
	}

	c.JSON(http.StatusOK, containers[0])
}

func (ctrl *ContainerController) Logs(c *gin.Context) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			for _, origin := range r.Header["Origin"] {
				if origin == "http://localhost:3000" {
					return true
				}
			}
			return false
		},
	}

	w, r := c.Writer, c.Request
	id := c.Params.ByName("id")

	// Upgrade our raw HTTP connection to a websocket based one
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	defer conn.Close()

	reader, err := ctrl.DockerClient.ContainerLogs(context.Background(), id, types.ContainerLogsOptions{Tail: "100", Follow: true, ShowStdout: true, ShowStderr: true, Timestamps: true})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	defer reader.Close()

	container, err := ctrl.DockerClient.ContainerInspect(context.Background(), id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !container.Config.Tty {
		for {
			header := make([]byte, 8)

			n, err := reader.Read(header)

			if err != nil || n != 8 {
				if err == io.EOF {
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			timestamp := make([]byte, 31) // 30 bytes for timestamp and 1 for the following space

			n, err = reader.Read(timestamp)

			if err != nil || n != 31 {
				if err == io.EOF {
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			outputSize := binary.BigEndian.Uint32(header[4:])
			output := make([]byte, outputSize-uint32(n)) // makes sure to remove size of timestamp read
			n, err = reader.Read(output)

			if err != nil {
				if err == io.EOF {
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			logMessage := LogMessage{
				Message:   string(output[:n]),
				Timestamp: string(timestamp),
				Id:        uuid.NewString(),
			}

			err = conn.WriteJSON(logMessage)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	} else {
		scanner := bufio.NewScanner(reader)

		logLines := []*LogMessage{}

		for scanner.Scan() {
			textSplitted := strings.SplitN(scanner.Text(), " ", 2)
			logLine := new(LogMessage)
			logLine.Timestamp, logLine.Message, logLine.Id = textSplitted[0], textSplitted[1], uuid.NewString()

			logLines = append(logLines, logLine)
		}

		if err := scanner.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, log := range logLines {
			err = conn.WriteJSON(log)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}
}

func (ctrl *ContainerController) Terminal(c *gin.Context) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			for _, origin := range r.Header["Origin"] {
				if origin == "http://localhost:3000" {
					return true
				}
			}
			return false
		},
	}

	w, r := c.Writer, c.Request

	// Upgrade our raw HTTP connection to a websocket based one
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		return
	}

	defer conn.Close()

	containerId := c.Params.ByName("id")

	idResponse, err := ctrl.DockerClient.ContainerExecCreate(context.Background(), containerId, types.ExecConfig{
		Cmd:          []string{"/bin/sh", "-i"},
		User:         "root",
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  true,
		Tty:          true,
		Detach:       false,
	})

	if err != nil {
		return
	}

	hijackedResponse, err := ctrl.DockerClient.ContainerExecAttach(context.Background(), idResponse.ID, types.ExecStartCheck{Tty: true, Detach: false})

	if err != nil {
		return
	}

	defer hijackedResponse.Close()

	execNotRunning := make(chan struct{})

	go func() {
		// Read content from container and send it to the client via websocket
		for {
			content := make([]byte, 1024)
			n, err := hijackedResponse.Reader.Read(content)

			if err != nil {
				break
			}

			err = conn.WriteMessage(websocket.BinaryMessage, content[:n])

			if err != nil {
				break
			}
		}
	}()

	go func() {
		// Read content from client and write it to the container via websocket
		for {
			_, buff, err := conn.ReadMessage()

			if err != nil {
				if err == io.EOF {
					break
				}
				break
			}

			_, err = hijackedResponse.Conn.Write(buff)

			if err != nil {
				break
			}
		}
	}()

	go func() {
		// Read content from client and write it to the container via websocket

		retries := 0

		for {
			if retries == 3 {
				execNotRunning <- struct{}{}
				break
			}

			res, err := ctrl.DockerClient.ContainerExecInspect(context.Background(), idResponse.ID)

			if err != nil {
				retries++
				continue
			}

			if !res.Running {
				execNotRunning <- struct{}{}
				break
			}
		}
	}()

	// When exec is not running anymore, close all connections
	<-execNotRunning
}

func (ctrl *ContainerController) Events(c *gin.Context) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			for _, origin := range r.Header["Origin"] {
				if origin == "http://localhost:3000" {
					return true
				}
			}
			return false
		},
	}

	w, r := c.Writer, c.Request

	// Upgrade our raw HTTP connection to a websocket based one
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		return
	}

	defer conn.Close()

	ctx, cancel := context.WithCancel(context.Background())

	defer cancel()

	msgCh, errCh := ctrl.DockerClient.Events(ctx, types.EventsOptions{Since: time.Now().Format(time.RFC3339)})

	for {
		select {
		case msg := <-msgCh:
			if msg.Type == "container" {
				if msg.Action == "start" || msg.Action == "stop" || msg.Action == "destroy" {
					err := conn.WriteJSON(msg)

					if err != nil {
						return
					}
				}
			}
		case <-errCh:
			return
		}
	}
}
