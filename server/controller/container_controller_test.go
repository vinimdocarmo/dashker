package controller_test

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/vinimdocarmo/dashker/ginmix"
)

// transportFunc allows us to inject a mock transport for testing. We define it
// here so we can detect the tlsconfig and return nil for only this type.
type transportFunc func(*http.Request) (*http.Response, error)

func (tf transportFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return tf(req)
}

func newMockClient(doer func(*http.Request) (*http.Response, error)) *http.Client {
	return &http.Client{
		Transport: transportFunc(doer),
	}
}

func TestGetList(t *testing.T) {
	cli, err := client.NewClient("http://127.0.0.1", "v1.29", newMockClient(func(r *http.Request) (*http.Response, error) {
		b, err := json.Marshal([]types.Container{
			{
				ID: "container_id1",
			},
			{
				ID: "container_id2",
			},
		})

		if err != nil {
			return nil, err
		}

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       ioutil.NopCloser(bytes.NewReader(b)),
		}, nil
	}), nil)

	if err != nil {
		t.Error(err)
	}

	router := ginmix.Mix(cli)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/container", nil)
	router.ServeHTTP(w, req)

	containers := []types.Container{}

	err = json.Unmarshal(w.Body.Bytes(), &containers)

	if err != nil {
		t.Error(err)
	}

	t.Log(containers)

	if len(containers) != 2 {
		t.Error("expected to return 2 containers")
	}

	if containers[0].ID != "container_id1" {
		t.Errorf("expected id container_id1; got %v", containers[0].ID)
	}

	if containers[1].ID != "container_id2" {
		t.Errorf("expected id container_id2; got %v", containers[1].ID)
	}
}
