package logger

import (
	"io"
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Level matches zerolog levels for strict level usage.
type Level = zerolog.Level

const (
	LevelDebug = zerolog.DebugLevel
	LevelInfo  = zerolog.InfoLevel
	LevelWarn  = zerolog.WarnLevel
	LevelError = zerolog.ErrorLevel
)

// Logger is the application logging interface. Use levels for all output.
type Logger interface {
	Debug() *zerolog.Event
	Info() *zerolog.Event
	Warn() *zerolog.Event
	Error() *zerolog.Event
	With() zerolog.Context
}

// New returns a zerolog-based Logger with level control.
func New(level string, out io.Writer) Logger {
	if out == nil {
		out = os.Stdout
	}
	lvl, err := zerolog.ParseLevel(level)
	if err != nil {
		lvl = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(lvl)
	z := zerolog.New(out).With().Timestamp().Logger()
	return &z
}

// Global sets the global zerolog logger (e.g. for request-id middleware).
func Global(l Logger) {
	if z, ok := l.(*zerolog.Logger); ok {
		log.Logger = *z
	}
}
