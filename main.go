package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	_ "github.com/mattn/go-sqlite3" // Driver SQLite C (mais performático)
	//_ "modernc.org/sqlite" // Driver SQLite Go (mais fácil de usar)
)

// Estrutura do nosso dado (ex: uma lista de tarefas)
type Tarefa struct {
	ID           int       `json:"id"`
	Nome         string    `json:"nome"`
	Descricao    string    `json:"descricao"`
	Feito        bool      `json:"feito"`
	Prioridade   int       `json:"prioridade"`
	DataCriacao  time.Time `json:"data_criacao"`
	DataExclusao time.Time `json:"data_exclusao"`
}

func main() {
	// 0. Obter a senha da variável de ambiente (ou usar uma padrão se não houver)
	senhaMestra := os.Getenv("APP_PASSWORD")
	if senhaMestra == "" {
		log.Println("AVISO: Variável APP_PASSWORD não definida. Usando 'admin123' por padrão.")
		senhaMestra = "admin123"
	}

	// 1. Conectar ao SQLite (Cria o arquivo dados.db se não existir)
	db, err := sql.Open("sqlite3", "./dados.db")
	//db, err := sql.Open("sqlite", "./dados.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Criar a tabela inicial
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tarefas (
			id INTEGER PRIMARY KEY, 
			nome TEXT, 
			descricao TEXT, 
			feito BOOLEAN, 
			prioridade INTEGER, 
			data_criacao DATETIME, 
			data_exclusao DATETIME
		)
	`)
	if err != nil {
		log.Fatal(err)
	}

	app := fiber.New()

	// Middleware de CORS para permitir acesso de qualquer origem (Outros hosts da rede local)
	app.Use(cors.New())

	// ROTA PARA O FRONTEND (Arquivos estáticos na pasta /public)
	// Deve vir ANTES do middleware de autenticação da API
	app.Static("/", "./public")

	// GRUPO DE API (Tudo que começar com /api será protegido)
	api := app.Group("/api")

	// Middleware de autenticação (só afeta o que está no grupo /api)
	api.Use(func(c *fiber.Ctx) error {
		if c.Get("X-Custom-Auth") != senhaMestra {
			return c.Status(401).JSON(fiber.Map{"error": "Não autorizado"})
		}
		return c.Next()
	})

	api.Get("/ping", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"pong": true})
	})

	// ROTA: Listar todas as tarefas (READ)
	api.Get("/tarefas", func(c *fiber.Ctx) error {
		rows, _ := db.Query("SELECT id, nome, descricao, prioridade, feito, data_criacao FROM tarefas WHERE data_exclusao IS NULL ORDER BY feito ASC, prioridade DESC")
		var tarefas []Tarefa
		for rows.Next() {
			var t Tarefa
			rows.Scan(&t.ID, &t.Nome, &t.Descricao, &t.Prioridade, &t.Feito, &t.DataCriacao)
			tarefas = append(tarefas, t)
		}
		return c.JSON(tarefas)
	})

	// ROTA: Criar nova tarefa (CREATE)
	api.Post("/tarefas", func(c *fiber.Ctx) error {
		t := new(Tarefa)
		if err := c.BodyParser(t); err != nil {
			return err
		}
		res, _ := db.Exec("INSERT INTO tarefas (nome, descricao, prioridade, feito, data_criacao) VALUES (?, ?, ?, ?, ?)", t.Nome, t.Descricao, t.Prioridade, t.Feito, time.Now())
		id, _ := res.LastInsertId()
		t.ID = int(id)
		return c.Status(201).JSON(t)
	})

	// ROTA: Atualizar tarefa (UPDATE)
	api.Put("/tarefas/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		t := new(Tarefa)
		if err := c.BodyParser(t); err != nil {
			return err
		}
		_, err := db.Exec("UPDATE tarefas SET nome = ?, descricao = ?, prioridade = ?, feito = ? WHERE id = ?", t.Nome, t.Descricao, t.Prioridade, t.Feito, id)
		if err != nil {
			return err
		}
		return c.JSON(t)
	})

	// ROTA: Deletar tarefa (DELETE)
	api.Delete("/tarefas/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		_, err := db.Exec("UPDATE tarefas SET data_exclusao = ? WHERE id = ?", time.Now(), id)
		if err != nil {
			return err
		}
		return c.SendStatus(204)
	})

	// 2. Rodar o servidor
	log.Fatal(app.Listen(":9998"))
}
