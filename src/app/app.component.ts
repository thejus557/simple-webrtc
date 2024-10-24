import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  remotePeerId: string = '';
  localPeerId: string = crypto.randomUUID();
  private dataChannel!: RTCDataChannel;

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.initializeConnection();
    await this.requestMediaStream();
    this.router.navigateByUrl(`/?id=${this.localPeerId}`);
  }

  // Initialize WebRTC connection with TURN servers
  async initializeConnection() {
    try {
      const response = await fetch(
        'https://surya-peer.metered.live/api/v1/turn/credentials?apiKey=155fcba4dcc4bdf916c19b928233ee6acbe0'
      );
      const iceServers = await response.json();

      this.peerConnection = new RTCPeerConnection({
        iceServers: iceServers,
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send the ICE candidate to the remote peer
          // You'll need to implement your signaling server to exchange this
          console.log('New ICE candidate:', event.candidate);
        }
      };

      // Handle incoming streams
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        this.displayVideoStream(event.streams[0], false, this.remotePeerId);
      };

      // Create data channel for signaling
      this.dataChannel = this.peerConnection.createDataChannel('signaling');
      this.setupDataChannelHandlers();
    } catch (error) {
      console.error('Failed to initialize WebRTC connection:', error);
    }
  }

  // Set up data channel event handlers
  private setupDataChannelHandlers() {
    this.dataChannel.onmessage = (event) => {
      console.log('Received message:', event.data);
    };

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  // Request video/audio permission
  async requestMediaStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Add tracks to the peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      this.displayVideoStream(this.localStream, true, this.localPeerId);
    } catch (error) {
      console.error('Failed to get media stream:', error);
    }
  }

  // Initiate call to remote peer
  async initiateCall() {
    if (!this.remotePeerId) return;

    try {
      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send the offer to the remote peer via your signaling server
      console.log('Created offer:', offer);

      // You'll need to implement signaling server communication here
      // this.signalingService.sendOffer(this.remotePeerId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // Handle incoming call
  async handleIncomingCall(offer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send the answer back to the caller via your signaling server
      console.log('Created answer:', answer);

      // You'll need to implement signaling server communication here
      // this.signalingService.sendAnswer(this.remotePeerId, answer);
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  }

  // Handle incoming answer from remote peer
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Display video stream (local or remote)
  displayVideoStream(stream: MediaStream, isMuted: boolean, peerId: string) {
    const videoElement = this.createVideoElement(stream, isMuted, peerId);
    this.appendVideoToContainer(videoElement, peerId);
  }

  // Create and configure a video element
  private createVideoElement(
    stream: MediaStream,
    isMuted: boolean,
    peerId: string
  ): HTMLVideoElement {
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.muted = isMuted;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.id = `video-${peerId}`;

    videoElement.addEventListener('loadedmetadata', () => {
      videoElement
        .play()
        .catch((error) => console.error('Error playing video:', error));
    });

    return videoElement;
  }

  // Append video element to the container
  private appendVideoToContainer(
    videoElement: HTMLVideoElement,
    peerId: string
  ) {
    const container = document.getElementById('video-container');
    if (container) {
      container.appendChild(videoElement);
    }
  }
}
