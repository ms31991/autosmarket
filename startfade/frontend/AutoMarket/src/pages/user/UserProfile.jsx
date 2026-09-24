import { useEffect, useState } from "react";
import {
  FiCheck,
  FiGrid,
  FiHeart,
  FiMoreHorizontal,
  FiUserPlus,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getFavourites,
  getMyVehicles,
  getProfile,
} from "../../services/userService";
import {
  acceptFriendRequest,
  getFriendStatus,
  getPublicProfile,
  getVehiclesByOwner,
  onFriendshipChanged,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../../services/friendService";
import { mediaUrl } from "../../utils/mediaUrl";
import "./UserProfile.css";

export const UserProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { dbUser, clerkUser, loadingDbUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [friendship, setFriendship] = useState({
    status: "self",
    friendshipId: null,
  });
  const [friendCount, setFriendCount] = useState(0);
  const [activeTab, setActiveTab] = useState("posts");
  const [friendMenuOpen, setFriendMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwn =
    !userId || (dbUser?.id && String(userId) === String(dbUser.id));

  useEffect(() => {
    if (userId && loadingDbUser) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setActiveTab("posts");
        setFriendMenuOpen(false);

        if (isOwn) {
          const [profileResult, vehiclesResult, favouritesResult] =
            await Promise.allSettled([
              getProfile(),
              getMyVehicles(),
              getFavourites(),
            ]);

          if (cancelled) return;

          const nextProfile =
            profileResult.status === "fulfilled"
              ? profileResult.value
              : dbUser;
          if (!nextProfile) {
            throw profileResult.reason || new Error("Profili nuk u gjet.");
          }

          setProfile(nextProfile);
          setFriendCount(nextProfile.friendCount || 0);
          setFriendship({ status: "self", friendshipId: null });
          setVehicles(
            vehiclesResult.status === "fulfilled" &&
              Array.isArray(vehiclesResult.value)
              ? vehiclesResult.value
              : []
          );

          if (
            vehiclesResult.status !== "fulfilled" ||
            !Array.isArray(vehiclesResult.value) ||
            vehiclesResult.value.length === 0
          ) {
            const ownerId = nextProfile.id || dbUser?.id;
            if (ownerId) {
              try {
                const fallback = await getVehiclesByOwner(ownerId);
                if (!cancelled && Array.isArray(fallback)) {
                  setVehicles(fallback);
                }
              } catch {
                /* keep previous vehicles */
              }
            }
          }
          setFavourites(
            favouritesResult.status === "fulfilled" &&
              Array.isArray(favouritesResult.value)
              ? favouritesResult.value
              : []
          );
        } else {
          const [publicProfile, ownerVehicles] = await Promise.all([
            getPublicProfile(userId),
            getVehiclesByOwner(userId),
          ]);

          if (cancelled) return;

          setProfile(publicProfile);
          setFriendCount(publicProfile.friendCount || 0);
          setFriendship(
            publicProfile.friendship || { status: "none", friendshipId: null }
          );
          setVehicles(Array.isArray(ownerVehicles) ? ownerVehicles : []);
          setFavourites([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Ndodhi një gabim.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, isOwn, dbUser?.id, loadingDbUser]);

  useEffect(() => {
    if (!profile?.id || isOwn) return undefined;
    return onFriendshipChanged(async () => {
      try {
        const data = await getFriendStatus(profile.id);
        setFriendship({
          status: data.status,
          friendshipId: data.friendshipId,
        });
        if (data.friendCount != null) {
          setFriendCount(data.friendCount);
        }
      } catch {
        /* keep current friendship state */
      }
    });
  }, [profile?.id, isOwn]);

  const refreshFriendship = async () => {
    const data = await getPublicProfile(profile.id);
    setFriendship(data.friendship || { status: "none", friendshipId: null });
    setFriendCount(data.friendCount || 0);
  };

  const handleAddFriend = async () => {
    if (busy || !profile?.id) return;
    setBusy(true);
    try {
      const result = await sendFriendRequest(profile.id);
      setFriendship(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (busy || !friendship.friendshipId) return;
    setBusy(true);
    try {
      const result = await acceptFriendRequest(friendship.friendshipId);
      setFriendship(result);
      await refreshFriendship();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy || !friendship.friendshipId) return;
    setBusy(true);
    try {
      await rejectFriendRequest(friendship.friendshipId);
      setFriendship({ status: "none", friendshipId: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    if (busy || !profile?.id) return;
    setBusy(true);
    try {
      await removeFriend(profile.id);
      setFriendship({ status: "none", friendshipId: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnfriend = async () => {
    if (busy || !profile?.id) return;
    setBusy(true);
    setFriendMenuOpen(false);
    try {
      await removeFriend(profile.id);
      setFriendship({ status: "none", friendshipId: null });
      setFriendCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="ig-profile-state">
        <div className="ig-profile-spinner" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="ig-profile-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  const fullName =
    `${profile.name || ""} ${profile.surname || ""}`.trim() ||
    (isOwn ? clerkUser?.fullName : "") ||
    "User";

  const username =
    (profile.email || clerkUser?.primaryEmailAddress?.emailAddress || "")
      .split("@")[0] || fullName.toLowerCase().replace(/\s+/g, ".");

  const avatarSrc = mediaUrl(
    profile.profileImage || (isOwn ? clerkUser?.imageUrl : "")
  );

  const getVehicleImage = (vehicle) => {
    const first = vehicle.images?.[0];
    return mediaUrl(first?.imageUrl || first?.url || first);
  };

  const getFavouriteImage = (favourite) => {
    const first = favourite.images?.[0];
    return mediaUrl(first?.imageUrl || first?.url || first);
  };

  const items = isOwn && activeTab === "favourites" ? favourites : vehicles;

  return (
    <div className="ig-profile">
      <header className="ig-profile-header">
        <div className="ig-avatar-ring">
          <img src={avatarSrc} alt={fullName} className="ig-avatar" />
        </div>

        <div className="ig-profile-info">
          <div className="ig-name-row">
            <h1>{isOwn ? username : fullName}</h1>

            {isOwn ? (
              <>
                <button
                  type="button"
                  className="ig-edit-btn"
                  onClick={() => navigate("/settings/edit-profile")}
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  className="ig-more-btn"
                  title="Settings"
                  onClick={() => navigate("/settings")}
                >
                  <FiMoreHorizontal />
                </button>
              </>
            ) : (
              <div className="ig-friend-actions">
                {friendship.status === "none" && (
                  <button
                    type="button"
                    className="ig-edit-btn"
                    disabled={busy}
                    onClick={handleAddFriend}
                  >
                    <FiUserPlus />
                    Add friend
                  </button>
                )}

                {friendship.status === "pending_sent" && (
                  <button
                    type="button"
                    className="ig-edit-btn ghost"
                    disabled={busy}
                    title="Cancel request"
                    onClick={handleCancelRequest}
                  >
                    Requested
                  </button>
                )}

                {friendship.status === "pending_received" && (
                  <>
                    <button
                      type="button"
                      className="ig-edit-btn"
                      disabled={busy}
                      onClick={handleAccept}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="ig-edit-btn ghost"
                      disabled={busy}
                      onClick={handleReject}
                    >
                      Reject
                    </button>
                  </>
                )}

                {friendship.status === "friends" && (
                  <div className="ig-friends-menu">
                    <button
                      type="button"
                      className="ig-edit-btn ghost"
                      onClick={() => setFriendMenuOpen((open) => !open)}
                    >
                      <FiCheck />
                      Friends
                    </button>
                    {friendMenuOpen && (
                      <div className="ig-friends-dropdown">
                        <button type="button" onClick={handleUnfriend}>
                          Unfriend
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ig-stats">
            <div>
              <strong>{vehicles.length}</strong>
              <span>posts</span>
            </div>
            <div>
              <strong>{friendCount}</strong>
              <span>friends</span>
            </div>
          </div>

          <div className="ig-bio">
            <strong>{fullName}</strong>
            {isOwn && profile.email && <span>{profile.email}</span>}
            {isOwn && profile.phoneNumber && <span>{profile.phoneNumber}</span>}
          </div>
        </div>
      </header>

      <div className="ig-tabs">
        <button
          type="button"
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}
        >
          <FiGrid />
          Posts
        </button>
        {isOwn && (
          <button
            type="button"
            className={activeTab === "favourites" ? "active" : ""}
            onClick={() => setActiveTab("favourites")}
          >
            <FiHeart />
            Saved
          </button>
        )}
      </div>

      <main className="ig-profile-content">
        {items.length === 0 ? (
          <div className="ig-empty">
            <div className="ig-empty-icon">
              {activeTab === "favourites" ? <FiHeart /> : <FiGrid />}
            </div>
            <h3>
              {activeTab === "favourites" ? "No saved vehicles" : "No posts yet"}
            </h3>
            <p>
              {activeTab === "favourites"
                ? "Vehicles you save will appear here."
                : "Vehicles listed on this profile will appear here."}
            </p>
          </div>
        ) : (
          <div className="ig-grid">
            {items.map((item) => {
              const id = item.id || item.vehicleId || item.favouriteId;
              const vehicleId = item.vehicleId || item.id;
              const title =
                activeTab === "favourites"
                  ? `${item.brand || ""} ${item.model || ""}`.trim()
                  : `${item.brandName || ""} ${item.modelName || ""}`.trim();
              const image =
                activeTab === "favourites"
                  ? getFavouriteImage(item)
                  : getVehicleImage(item);

              return (
                <button
                  key={id}
                  type="button"
                  className="ig-cell"
                  onClick={() => navigate(`/vehicles/${vehicleId}`)}
                >
                  <img src={image} alt={title || "Vehicle"} />
                  <div className="ig-cell-overlay">
                    <strong>{title}</strong>
                    <span>€{Number(item.price || 0).toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
