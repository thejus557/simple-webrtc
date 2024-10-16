import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import Peer from 'peerjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  peer!: Peer;
  remoteUserId: string = ''; // For Peer ID input
  localStream!: MediaStream;
  videoElement!: HTMLVideoElement;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.peer = new Peer(); // Peer initialized without an ID, a random one will be assigned
    this.peer.on('open', (id) => {
      console.log('My peer ID is: ' + id); // Log your peer ID for reference
      this.router.navigateByUrl(`/?id=${id}`); // Use peer ID in the URL
    });

    // Request video/audio permission
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        this.localStream = stream;
        this.addVideoStream(stream, true); // Add local video

        this.peer.on('call', (call) => {
          console.log('connectid', call);
          console.log('Incoming call');
          call.answer(stream); // Answer call with local stream
          call.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            this.addVideoStream(remoteStream, true); // Display remote stream
          });
        });
      })
      .catch((err) => {
        console.error('Failed to get media stream:', err);
      });
  }

  // Handle form submission
  submitForm() {
    console.log('Calling peer:', this.remoteUserId);
    const call = this.peer.call(this.remoteUserId, this.localStream); // Call peer
    call.on('stream', (r) => {
      console.log('nw user');
      this.addVideoStream(r, false);
    });
    // thiscall.on('error', (err: any) => {
    //   console.error('Call error:', err);
    // });
  }

  // Helper function to add video stream
  addVideoStream(stream: MediaStream, muted: boolean) {
    // Create a new video element if it doesn't exist
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = stream;
    this.videoElement.muted = muted;
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.videoElement.play();
    });

    const container = document.getElementById('container');
    container?.appendChild(this.videoElement);
  }
}
