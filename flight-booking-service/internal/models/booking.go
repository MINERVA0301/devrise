package models

import "time"

// Passenger holds passenger information
type Passenger struct {
	FirstName      string `json:"firstName" binding:"required"`
	LastName       string `json:"lastName" binding:"required"`
	DateOfBirth    string `json:"dateOfBirth" binding:"required"`
	Nationality    string `json:"nationality" binding:"required"`
	PassportNumber string `json:"passportNumber" binding:"required"`
	PassportExpiry string `json:"passportExpiry" binding:"required"`
}

// CreateBookingRequest is the request body for POST /api/v1/bookings
type CreateBookingRequest struct {
	FlightID     string      `json:"flightId" binding:"required"`
	Cabin        string      `json:"cabin" binding:"required"`
	FareClass    string      `json:"fareClass" binding:"required"`
	Seats        []string    `json:"seats" binding:"required,min=1"`
	Passengers   []Passenger `json:"passengers" binding:"required,min=1"`
	ContactEmail string      `json:"contactEmail" binding:"required,email"`
	ContactPhone string      `json:"contactPhone" binding:"required"`
}

// Booking is the full booking record
type Booking struct {
	BookingID       string      `json:"bookingId"`
	PNR             string      `json:"pnr"`
	Status          string      `json:"status"`
	FlightID        string      `json:"flightId"`
	FlightNumber    string      `json:"flightNumber"`
	Origin          string      `json:"origin"`
	Destination     string      `json:"destination"`
	DepartureAt     time.Time   `json:"departureAt"`
	Cabin           string      `json:"cabin"`
	FareClass       string      `json:"fareClass"`
	Seats           []string    `json:"seats"`
	Passengers      []Passenger `json:"passengers,omitempty"`
	ContactEmail    string      `json:"contactEmail,omitempty"`
	ContactPhone    string      `json:"contactPhone,omitempty"`
	TotalAmount     float64     `json:"totalAmount"`
	Currency        string      `json:"currency"`
	PaymentDeadline time.Time   `json:"paymentDeadline"`
	CreatedAt       time.Time   `json:"createdAt"`
	PassengerID     string      `json:"passengerId,omitempty"`
}

// FlightInfo holds flight metadata (mock data)
type FlightInfo struct {
	FlightID     string
	FlightNumber string
	Origin       string
	Destination  string
	DepartureAt  time.Time
	BasePrice    float64
	Currency     string
}

