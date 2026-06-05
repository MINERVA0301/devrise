package store

import (
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"flight-booking-service/internal/models"
)

var mockFlights = map[string]models.FlightInfo{
	"fl_8a2b3c4d-5e6f-7a8b-9c0d": {
		FlightID:     "fl_8a2b3c4d-5e6f-7a8b-9c0d",
		FlightNumber: "TG401",
		Origin:       "BKK",
		Destination:  "NRT",
		DepartureAt:  time.Now().Add(72 * time.Hour).Truncate(time.Hour),
		BasePrice:    4500.00,
		Currency:     "THB",
	},
	"fl_1a2b3c4d-5e6f-7a8b-9c0d": {
		FlightID:     "fl_1a2b3c4d-5e6f-7a8b-9c0d",
		FlightNumber: "TG615",
		Origin:       "BKK",
		Destination:  "LHR",
		DepartureAt:  time.Now().Add(48 * time.Hour).Truncate(time.Hour),
		BasePrice:    12500.00,
		Currency:     "THB",
	},
}

type Store struct {
	mu       sync.RWMutex
	bookings map[string]*models.Booking
	pnrIndex map[string]string // PNR → bookingId
}

func New() *Store {
	return &Store{
		bookings: make(map[string]*models.Booking),
		pnrIndex: make(map[string]string),
	}
}

func (s *Store) Create(req models.CreateBookingRequest) *models.Booking {
	flight, ok := mockFlights[req.FlightID]
	if !ok {
		flight = models.FlightInfo{
			FlightID:     req.FlightID,
			FlightNumber: "XX000",
			Origin:       "BKK",
			Destination:  "DMK",
			DepartureAt:  time.Now().Add(24 * time.Hour).Truncate(time.Hour),
			BasePrice:    1000.00,
			Currency:     "THB",
		}
	}

	now := time.Now().UTC()
	b := &models.Booking{
		BookingID:       newBookingID(),
		PNR:             newPNR(),
		Status:          "CONFIRMED",
		FlightID:        flight.FlightID,
		FlightNumber:    flight.FlightNumber,
		Origin:          flight.Origin,
		Destination:     flight.Destination,
		DepartureAt:     flight.DepartureAt,
		Cabin:           req.Cabin,
		FareClass:       req.FareClass,
		Seats:           req.Seats,
		Passengers:      req.Passengers,
		ContactEmail:    req.ContactEmail,
		ContactPhone:    req.ContactPhone,
		TotalAmount:     flight.BasePrice * float64(len(req.Seats)),
		Currency:        flight.Currency,
		PaymentDeadline: now.Add(24 * time.Hour),
		CreatedAt:       now,
	}

	s.mu.Lock()
	s.bookings[b.BookingID] = b
	s.pnrIndex[b.PNR] = b.BookingID
	s.mu.Unlock()

	return b
}

func (s *Store) GetByID(id string) (*models.Booking, bool) {
	s.mu.RLock()
	b, ok := s.bookings[id]
	s.mu.RUnlock()
	return b, ok
}

func (s *Store) GetByPNR(pnr string) (*models.Booking, bool) {
	s.mu.RLock()
	id, ok := s.pnrIndex[pnr]
	if !ok {
		s.mu.RUnlock()
		return nil, false
	}
	b := s.bookings[id]
	s.mu.RUnlock()
	return b, true
}

func newBookingID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("bk_%x", b)
}

func newPNR() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b)
}
