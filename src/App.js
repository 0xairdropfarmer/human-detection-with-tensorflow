import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";

import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const App = () => {
  const [records, setRecords] = useState([]);

  const videoElement = useRef(null);
  const startButtonElement = useRef(null);
  const stopButtonElement = useRef(null);

  const shouldRecordRef = useRef(false);
  const modelRef = useRef(null);
  const recordingRef = useRef(false);
  const lastDetectionsRef = useRef([]);
  const recorderRef = useRef(null);

  useEffect(() => {
    prepare();
    detectFrame()
  }, []);
  async function prepare() {
    startButtonElement.current.setAttribute("disabled", true);
    stopButtonElement.current.setAttribute("disabled", true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        window.stream = stream;
        videoElement.current.srcObject = stream;
        const model = await cocoSsd.load();

        modelRef.current = model;
        startButtonElement.current.removeAttribute("disabled");
      } catch (error) {
        console.error(error);
      }
    }
  }
  async function detectFrame() {
    if (!shouldRecordRef.current) {
      stopRecording();
      return;
    }

    const predictions = await modelRef.current.detect(videoElement.current);

    let foundPerson = false;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].class == "person") {
        foundPerson = true;
      }
    }

    if (foundPerson) {
      startRecording();
      lastDetectionsRef.current.push(true);
    } else if (lastDetectionsRef.current.filter(Boolean).length) {
      startRecording();
      lastDetectionsRef.current.push(false);
    } else {
      stopRecording();
    }

    lastDetectionsRef.current = lastDetectionsRef.current.slice(
      Math.max(lastDetectionsRef.current.length - 10, 0)
    );

    requestAnimationFrame(() => {
      detectFrame();
    });
  }

  function startRecording() {
    if (recordingRef.current) {
      return;
    }

    recordingRef.current = true;
    console.log("start recording");

    recorderRef.current = new MediaRecorder(window.stream);

    recorderRef.current.ondataavailable = function (e) {
      const title = new Date() + "";
      const href = URL.createObjectURL(e.data);
      setRecords(previousRecords => {
        return [...previousRecords, { href, title }];
      });
    };

    recorderRef.current.start();
  }

  function stopRecording() {
    if (!recordingRef.current) {
      return;
    }

    recordingRef.current = false;
    recorderRef.current.stop();
    console.log("stopped recording");
    lastDetectionsRef.current = [];
  }

  return (
    <div className="container-fluid">
      <div class="row">
        <div class="col">
          <video autoPlay playsInline muted ref={videoElement} />
        </div>
        <div class="col">
          <div>
            <div class="btn-toolbar" role="toolbar">
              <div className="btn-group mr-2" role="group">
                <button
                  className="btn btn-success"
                  onClick={() => {
                    shouldRecordRef.current = true;
                    stopButtonElement.current.removeAttribute("disabled");
                    startButtonElement.current.setAttribute("disabled", true);
                    detectFrame();
                  }}
                  ref={startButtonElement}
                >
                  Start
            </button>
              </div>
              <div className="btn-group mr-2" role="group">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    shouldRecordRef.current = false;
                    startButtonElement.current.removeAttribute("disabled");
                    stopButtonElement.current.setAttribute("disabled", true);
                    stopRecording();
                  }}
                  ref={stopButtonElement}
                >
                  Stop
            </button>
              </div>
            </div>
            <div className="row p-3">
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th>Records Time</th>
                  </tr>
                </thead>
                <tbody>
                  {!records.length
                    ? <tr>
                      <td>No record yet</td>
                    </tr>
                    : records.map(record => {
                      return (
                        <tr>
                          <td> <a href={record.href}>{moment(record.title).format('LLLL')}</a></td>
                        </tr>
                      );
                    })}

                </tbody>
              </table>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
