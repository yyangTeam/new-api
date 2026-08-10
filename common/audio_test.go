package common

import (
	"bytes"
	"context"
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// makeWAV builds a minimal valid PCM WAV file in memory. sampleRate in Hz,
// seconds controls the length of the (zeroed) PCM data. One channel, 16-bit.
func makeWAV(sampleRate uint32, seconds float64) []byte {
	const numChans, bitsPerSample = 1, 16
	bytesPerFrame := uint32(numChans * bitsPerSample / 8)
	byteRate := sampleRate * bytesPerFrame
	dataSize := uint32(float64(byteRate) * seconds)

	buf := bytes.NewBuffer(make([]byte, 0, 44+int(dataSize)))
	buf.WriteString("RIFF")
	binary.Write(buf, binary.LittleEndian, uint32(36+dataSize)) // chunkSize
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	binary.Write(buf, binary.LittleEndian, uint32(16))            // subchunk1 size
	binary.Write(buf, binary.LittleEndian, uint16(1))              // PCM format
	binary.Write(buf, binary.LittleEndian, uint16(numChans))       // channels
	binary.Write(buf, binary.LittleEndian, sampleRate)             // sample rate
	binary.Write(buf, binary.LittleEndian, byteRate)              // byte rate
	binary.Write(buf, binary.LittleEndian, uint16(bytesPerFrame)) // block align
	binary.Write(buf, binary.LittleEndian, uint16(bitsPerSample))  // bits per sample
	buf.WriteString("data")
	binary.Write(buf, binary.LittleEndian, dataSize)
	buf.Write(make([]byte, dataSize))
	return buf.Bytes()
}

func TestGetAudioDurationUnsupported(t *testing.T) {
	_, err := GetAudioDuration(context.Background(), bytes.NewReader([]byte{0x00}), ".xyz")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported audio format")
}

func TestGetAudioDurationWAV(t *testing.T) {
	// 8000 Hz, 1 channel, 16-bit -> 16000 B/s. A 2-second file is 32000 B.
	wav := makeWAV(8000, 2.0)
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.InDelta(t, 2.0, dur, 0.01)
}

func TestGetAudioDurationWAVDifferentRate(t *testing.T) {
	// 44100 Hz, 0.5 seconds.
	wav := makeWAV(44100, 0.5)
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.InDelta(t, 0.5, dur, 0.01)
}

func TestGetAudioDurationInvalidWAV(t *testing.T) {
	// Not a real WAV header -> decoder rejects it.
	_, err := GetAudioDuration(context.Background(), bytes.NewReader([]byte("not a wav file")), ".wav")
	require.Error(t, err)
}

func TestGetAudioDurationEmptyWAV(t *testing.T) {
	// A header-only WAV (zero-length data) still parses; the fileSize
	// fallback recomputes PCMSize to 0 -> duration 0.
	wav := makeWAV(8000, 0)
	// Trim the zero data block away so the file is exactly 44 bytes of header.
	wav = wav[:44]
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.Equal(t, 0.0, dur)
}
