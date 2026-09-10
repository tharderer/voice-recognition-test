let publicBeaconClaimInFlight = false;
const claimPublicBeaconBase = claimPublicBeacon;
claimPublicBeacon = async function guardedClaimPublicBeacon() {
  if (publicBeaconClaimInFlight || publicBeaconPeer || session.phase !== "lobby" || !session.isHost || session.practice) return;
  publicBeaconClaimInFlight = true;
  try {
    await claimPublicBeaconBase();
  } finally {
    publicBeaconClaimInFlight = false;
  }
};
