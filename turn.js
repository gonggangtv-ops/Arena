// Optional: TURN servers so friends on mobile data (carrier NAT) can connect.
// Free option: create a Metered account (free tier 20 GB/month), copy the iceServers it gives you, e.g.
// window.AR_ICE=[{urls:'turn:YOURAPP.metered.live:80',username:'...',credential:'...'},{urls:'turns:YOURAPP.metered.live:443?transport=tcp',username:'...',credential:'...'}];
window.AR_ICE=window.AR_ICE||[];
