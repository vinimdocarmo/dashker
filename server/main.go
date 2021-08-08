package main

import (
	"github.com/vinimdocarmo/dashker/controller"

	"github.com/docker/docker/client"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cli, err := client.NewClientWithOpts(client.FromEnv)

	if err != nil {
		panic(err)
	}

	dockerCtrl := controller.DockerController{DockerClient: cli}

	r := gin.Default()

	// - No origin allowed by default
	// - GET,POST, PUT, HEAD methods
	// - Credentials share disabled
	// - Preflight requests cached for 12 hours
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}

	r.Use(cors.New(config))

	r.GET("ws/container/:id/logs", dockerCtrl.Logs)
	r.GET("/container", dockerCtrl.List)
	r.PUT("/container/:id/start", dockerCtrl.Start)
	r.PUT("/container/:id/stop", dockerCtrl.Stop)
	r.PUT("/container/:id/remove", dockerCtrl.Remove)

	r.Run(":3001")
}
