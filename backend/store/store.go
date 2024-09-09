package store

import (
	"database/sql"
	"fmt"
	"neo-cat/backend/model"
	"strings"
	"sync"

	_ "github.com/glebarez/go-sqlite"
)

type Store struct {
	sync.Mutex
	db *sql.DB
}

func New(connStr string) (*Store, error) {
	db, err := sql.Open("sqlite", connStr)
	if err != nil {
		return nil, err
	}

	ret := &Store{db: db}
	if err := ret.createTables(); err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *Store) Close() {
	s.Lock()
	defer s.Unlock()

	if s.db != nil {
		return
	}
	s.db.Close()
}

func (s *Store) createTables() error {
	s.Lock()
	defer s.Unlock()

	query := `
		CREATE TABLE IF NOT EXISTS users (
			username TEXT PRIMARY KEY,
			password TEXT
		);
	`
	if _, err := s.db.Exec(query); err != nil {
		return err
	}

	query = `
		CREATE TABLE IF NOT EXISTS config (
			key TEXT PRIMARY KEY,
			value TEXT
		);
	`
	if _, err := s.db.Exec(query); err != nil {
		return err
	}

	return nil
}

func (s *Store) CountUsers() (int, error) {
	s.Lock()
	defer s.Unlock()
	query := `SELECT COUNT(*) FROM users;`
	var count int
	if err := s.db.QueryRow(query).Scan(&count); err != nil {
		return -1, err
	}
	return count, nil
}

func (s *Store) AddUser(user *model.User) error {
	s.Lock()
	defer s.Unlock()
	query := `INSERT OR REPLACE INTO users (username, password) VALUES (?, ?);`
	_, err := s.db.Exec(query, strings.ToLower(user.Username), user.Password)
	return err
}

func (s *Store) DeleteUser(username string) error {
	s.Lock()
	defer s.Unlock()
	query := `DELETE FROM users WHERE username = ?;`
	_, err := s.db.Exec(query, strings.ToLower(username))
	return err
}

func (s *Store) VerifyUserPassword(username, password string) bool {
	s.Lock()
	defer s.Unlock()
	query := `SELECT password FROM users WHERE username = ?;`
	var pass string
	if err := s.db.QueryRow(query, strings.ToLower(username)).Scan(&pass); err != nil {
		return false
	}
	return pass == password
}

func (s *Store) SetConfig(key, value string) error {
	s.Lock()
	defer s.Unlock()
	query := `INSERT OR REPLACE INTO config (key, value) VALUES (?, ?);`
	_, err := s.db.Exec(query, key, value)
	return err
}

func (s *Store) GetConfig(key string) (string, error) {
	s.Lock()
	defer s.Unlock()
	query := `SELECT value FROM config WHERE key = ?;`
	var value string
	if err := s.db.QueryRow(query, key).Scan(&value); err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("config %q not found", key)
		}
		return "", err
	}
	return value, nil
}

func (s *Store) DeleteConfig(key string) error {
	s.Lock()
	defer s.Unlock()
	query := `DELETE FROM config WHERE key = ?;`
	_, err := s.db.Exec(query, key)
	return err
}

func (s *Store) GetConfigs() (map[string]string, error) {
	s.Lock()
	defer s.Unlock()

	query := `SELECT key, value FROM config;`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}

	ret := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		ret[key] = value
	}
	return ret, nil
}
