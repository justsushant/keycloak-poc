package main

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func pingHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func main() {
	r := gin.Default()
	// Add CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Access-Control-Allow-Origin"},
		ExposeHeaders:    []string{"Origin", "Content-Length", "Authorization", "Access-Control-Allow-Origin"},
		AllowCredentials: true,
	}))

	r.Static("/static", "./public")
	r.StaticFile("/worker.js", "./public/worker.js")

	// serve home html file
	r.GET("/home", func(c *gin.Context) {
		c.Header("Service-Worker-Allowed", "/")
		c.File("./public/home.html")
	})

	// serve play html file
	r.GET("/play", func(c *gin.Context) {
		c.Header("Service-Worker-Allowed", "/")
		c.File("./public/play.html")
	})

	r.GET("/ping", pingHandler)

	// 404 handler
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Not Found",
		})
	})

	err := r.RunTLS(":3000", "../localhost.pem", "../localhost-key.pem")
	if err != nil {
		panic(err)
	}
}
