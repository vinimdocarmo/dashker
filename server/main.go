package main

import (
	"github.com/docker/docker/client"
	"github.com/vinimdocarmo/dashker/ginmix"
)

func main() {
	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		panic(err)
	}

	ginmix.Mix(cli).Run(":3001")
}
