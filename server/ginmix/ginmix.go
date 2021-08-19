package ginmix

import (
	"github.com/docker/docker/client"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/vinimdocarmo/dashker/controller"
)

func Mix(cli *client.Client) *gin.Engine {
	dockerCtrl := controller.ContainerController{DockerClient: cli}

	r := gin.Default()

	// - No origin allowed by default
	// - GET,POST, PUT, HEAD methods
	// - Credentials share disabled
	// - Preflight requests cached for 12 hours
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}

	r.Use(cors.New(config))

	r.GET("ws/container/events", dockerCtrl.Events)
	r.GET("ws/container/:id/terminal", dockerCtrl.Terminal)
	r.GET("ws/container/:id/stats", dockerCtrl.Stats)
	r.GET("ws/container/:id/logs", dockerCtrl.Logs)
	r.GET("/container", dockerCtrl.List)
	r.GET("/container/:id", dockerCtrl.Get)
	r.PUT("/container/:id/start", dockerCtrl.Start)
	r.PUT("/container/:id/stop", dockerCtrl.Stop)
	r.PUT("/container/:id/remove", dockerCtrl.Remove)
	r.PUT("/container/:id/restart", dockerCtrl.Restart)

	return r
}
