package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
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

func handleRequests() {
	http.HandleFunc("/container", getContainers)
	http.HandleFunc("/container/", handleContainerSubRoutes)
	log.Fatal(http.ListenAndServe(":3001", nil))
}

func main() {
	handleRequests()
}
