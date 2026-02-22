import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix missing marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface LocationPickerProps {
    latitude: number | null
    longitude: number | null
    onChange: (lat: number, lng: number) => void
}

function LocationMarker({ position, onChange }: { position: L.LatLng | null, onChange: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng)
        },
    })

    return position === null ? null : (
        <Marker position={position} />
    )
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
    // Default to Indonesia center if no location is set
    const defaultCenter: [number, number] = [-0.789275, 113.921327]
    const initCenter: [number, number] = latitude && longitude ? [latitude, longitude] : defaultCenter

    const [position, setPosition] = useState<L.LatLng | null>(
        latitude && longitude ? L.latLng(latitude, longitude) : null
    )

    useEffect(() => {
        if (latitude && longitude) {
            setPosition(L.latLng(latitude, longitude))
        } else {
            setPosition(null)
        }
    }, [latitude, longitude])

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MapContainer
                center={initCenter}
                zoom={latitude && longitude ? 15 : 5}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker
                    position={position}
                    onChange={(lat, lng) => {
                        setPosition(L.latLng(lat, lng))
                        onChange(lat, lng)
                    }}
                />
            </MapContainer>
        </div>
    )
}
