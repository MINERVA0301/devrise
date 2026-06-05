package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"flight-booking-service/internal/models"
	"flight-booking-service/internal/store"
)

func newServer(st *store.Store, origin string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/bookings", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, origin)
		var req models.CreateBookingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
			return
		}
		if err := validateCreate(req); err != nil {
			writeJSON(w, http.StatusBadRequest, errBody(err.Error()))
			return
		}
		if len(req.Seats) != len(req.Passengers) {
			writeJSON(w, http.StatusUnprocessableEntity, errBody("seats count must equal passengers count"))
			return
		}
		b, err := st.Create(req)
		if err != nil {
			var conflict *store.ErrSeatConflict
			if errors.As(err, &conflict) {
				writeJSON(w, http.StatusConflict, errBody(err.Error()))
				return
			}
			writeJSON(w, http.StatusInternalServerError, errBody("internal error"))
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"data": b})
	})

	mux.HandleFunc("GET /api/v1/bookings/pnr/{pnr}", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, origin)
		b, ok := st.GetByPNR(strings.ToUpper(r.PathValue("pnr")))
		if !ok {
			writeJSON(w, http.StatusNotFound, errBody("booking not found"))
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": b})
	})

	mux.HandleFunc("GET /api/v1/bookings/{id}", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, origin)
		b, ok := st.GetByID(r.PathValue("id"))
		if !ok {
			writeJSON(w, http.StatusNotFound, errBody("booking not found"))
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": b})
	})

	mux.HandleFunc("OPTIONS /", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, origin)
		w.WriteHeader(http.StatusNoContent)
	})

	return mux
}

func main() {
	st := store.New()
	origin := os.Getenv("FRONTEND_ORIGIN")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("flight-booking-service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, newServer(st, origin)))
}

func setCORS(w http.ResponseWriter, origin string) {
	if origin == "" {
		origin = "*"
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func errBody(msg string) map[string]string { return map[string]string{"error": msg} }

func validateCreate(r models.CreateBookingRequest) error {
	switch {
	case r.FlightID == "":
		return errors.New("flightId is required")
	case r.Cabin == "":
		return errors.New("cabin is required")
	case r.FareClass == "":
		return errors.New("fareClass is required")
	case len(r.Seats) == 0:
		return errors.New("at least one seat is required")
	case len(r.Passengers) == 0:
		return errors.New("at least one passenger is required")
	case r.ContactEmail == "":
		return errors.New("contactEmail is required")
	case r.ContactPhone == "":
		return errors.New("contactPhone is required")
	}
	return nil
}
