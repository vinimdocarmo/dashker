package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

func getContainers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{})
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

func handleRequests() {
	http.HandleFunc("/container", getContainers)
	log.Fatal(http.ListenAndServe(":3001", nil))
}

func main() {
	handleRequests()
}
