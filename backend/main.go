package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	gocloak "github.com/Nerzal/gocloak/v13"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var client *gocloak.GoCloak
var clientID, clientSecret, realm string
var realmAdmin, realmAdminPass string

type UserRequestDTO struct {
	UserName  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

func init() {
	// Credentials for testing.
	// Do not whine
	client = gocloak.NewClient("https://192.168.0.104:8443")
	clientID = "qwerty-backend"
	clientSecret = "xNfNiuyhX4r4KanmTtjwROugCkPqGrqk"
	realmAdmin = "qwerty-backend-admin"
	realmAdminPass = "admin"
	realm = "test"
}

// Simple PoC Application to test writing an Auth Middleware for Keycloak to secure
// endpoints.
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		accessToken := c.Request.Header.Get("Authorization")
		if accessToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Missing Authorization header",
			})
			return
		}
		extractedToken := strings.Split(accessToken, "Bearer ")[1]

		rptResult, err := client.RetrospectToken(c, extractedToken, clientID, clientSecret, realm)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"message": "Failed Token Inspection",
				"error":   err.Error(),
			})
			return
		}
		if !*rptResult.Active {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid Token",
			})
			return
		}
		if *rptResult.Type == "Refresh" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid Token",
			})
			return
		}
		c.Set("permissions", rptResult.Permissions)
		c.Next()
	}
}

func readinessProbe(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func checkLiveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "ok",
	})
}

func register(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Failed to read body",
			"error":   err.Error(),
		})
		return
	}
	var jsonObj *UserRequestDTO = &UserRequestDTO{}
	err = json.Unmarshal(body, jsonObj)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Failed to parse body",
			"error":   err.Error(),
		})
		return
	}
	user := gocloak.User{
		Email:         gocloak.StringP(jsonObj.Email),
		Username:      gocloak.StringP(jsonObj.UserName),
		FirstName:     gocloak.StringP(jsonObj.FirstName),
		LastName:      gocloak.StringP(jsonObj.LastName),
		Enabled:       gocloak.BoolP(true),
		EmailVerified: gocloak.BoolP(true),
	}
	log.Printf("User: %v\n", *user.Email)
	log.Printf("jsonObj: %v\n", jsonObj.Email)
	var adminClient *gocloak.JWT
	adminClient, err = client.LoginAdmin(c, realmAdmin, realmAdminPass, realm)
	if err != nil {
		log.Println(err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to contact Auth Service",
			"error":   err.Error(),
		})
		return
	}
	var userID string
	userID, err = client.CreateUser(c, adminClient.AccessToken, realm, user)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create user",
			"error":   err.Error(),
		})
		return
	}
	err = client.SetPassword(c, adminClient.AccessToken, userID, realm, jsonObj.Password, false)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to set password",
			"error":   err.Error(),
		})
		return
	}
	var loginTokens *gocloak.JWT
	loginTokens, err = client.Login(c, clientID, clientSecret, realm, jsonObj.UserName, jsonObj.Password)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to login",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           userID,
		"idToken":      loginTokens.IDToken,
		"accessToken":  loginTokens.AccessToken,
		"refreshToken": loginTokens.RefreshToken,
	})
}

func login(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Failed to read body",
			"error":   err.Error(),
		})
		return
	}
	var jsonObj *UserRequestDTO = &UserRequestDTO{}
	err = json.Unmarshal(body, jsonObj)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Failed to parse body",
			"error":   err.Error(),
		})
		return
	}

	var loginTokens *gocloak.JWT
	loginTokens, err = client.Login(c, clientID, clientSecret, realm, jsonObj.UserName, jsonObj.Password)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"message": "Failed to login",
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"idToken":      loginTokens.IDToken,
		"accessToken":  loginTokens.AccessToken,
		"refreshToken": loginTokens.RefreshToken,
	})
}

func protectedData(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "ok",
	})
}

func postProtectedData(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Ok Changed",
	})
}

func refreshToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Missing Token",
		})
		return
	}
	loginToken, err := client.RefreshToken(c, token, clientID, clientSecret, realm)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to refresh token",
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"idToken":      loginToken.IDToken,
		"accessToken":  loginToken.AccessToken,
		"refreshToken": loginToken.RefreshToken,
	})
}

func main() {
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Origin", "Content-Length", "Authorization"},
		AllowCredentials: true,
	}))

	publicRoute := r.Group("/public")
	publicRoute.GET("/ping", readinessProbe)
	publicRoute.GET("/liveness", checkLiveness)
	publicRoute.POST("/login", login)
	publicRoute.POST("/register", register)
	publicRoute.POST("/refresh/:token", refreshToken)
	privateRoute := r.Group("/private")
	privateRoute.Use(authMiddleware())
	privateRoute.GET("/data", protectedData)
	privateRoute.POST("/data", postProtectedData)
	// err := r.Run(":5000")
	err := r.RunTLS(":5000", "../localhost.pem", "../localhost-key.pem")
	if err != nil {
		panic(err)
	}
}
