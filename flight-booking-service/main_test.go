package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"flight-booking-service/internal/store"
)

func makeServer() http.Handler {
	return newServer(store.New(), "")
}

var validBody = map[string]any{
	"flightId":  "fl_8a2b3c4d-5e6f-7a8b-9c0d",
	"cabin":     "economy",
	"fareClass": "M",
	"seats":     []string{"14A"},
	"passengers": []map[string]string{{
		"firstName":      "Somchai",
		"lastName":       "Jaidee",
		"dateOfBirth":    "1990-05-15",
		"nationality":    "THA",
		"passportNumber": "AA1234567",
		"passportExpiry": "2030-12-31",
	}},
	"contactEmail": "somchai@example.com",
	"contactPhone": "+66812345678",
}

func post(srv http.Handler, body any) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)
	return w
}

func TestCreateBooking_HappyPath(t *testing.T) {
	srv := makeServer()
	w := post(srv, validBody)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal("response is not valid JSON:", err)
	}
	data, ok := resp["data"].(map[string]any)
	if !ok {
		t.Fatal("response missing 'data' field")
	}
	if data["bookingId"] == "" {
		t.Error("bookingId should be set")
	}
	if data["pnr"] == "" {
		t.Error("pnr should be set")
	}
	if data["status"] != "PENDING" {
		t.Errorf("expected status PENDING, got %v", data["status"])
	}
}

func TestCreateBooking_SeatConflict(t *testing.T) {
	srv := makeServer()

	// First booking succeeds
	if w := post(srv, validBody); w.Code != http.StatusCreated {
		t.Fatalf("first booking failed: %d — %s", w.Code, w.Body.String())
	}

	// Second booking with same seat on same flight → 409
	w := post(srv, validBody)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 on seat conflict, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] == "" {
		t.Error("expected error message in response")
	}
}

func TestCreateBooking_MissingFields(t *testing.T) {
	srv := makeServer()

	cases := []struct {
		name string
		body map[string]any
	}{
		{"missing flightId", map[string]any{"cabin": "economy", "fareClass": "M", "seats": []string{"1A"}, "passengers": []map[string]string{{"firstName": "A", "lastName": "B", "dateOfBirth": "1990-01-01", "nationality": "THA", "passportNumber": "P1", "passportExpiry": "2030-01-01"}}, "contactEmail": "a@b.com", "contactPhone": "+1"}},
		{"missing contactEmail", map[string]any{"flightId": "fl_8a2b3c4d-5e6f-7a8b-9c0d", "cabin": "economy", "fareClass": "M", "seats": []string{"1A"}, "passengers": []map[string]string{{"firstName": "A", "lastName": "B", "dateOfBirth": "1990-01-01", "nationality": "THA", "passportNumber": "P1", "passportExpiry": "2030-01-01"}}, "contactPhone": "+1"}},
		{"empty body", map[string]any{}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := post(srv, tc.body)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d — body: %s", w.Code, w.Body.String())
			}
		})
	}
}
