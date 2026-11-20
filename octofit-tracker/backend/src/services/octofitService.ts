import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  if (
    typeof userId !== 'string'
    || !mongoose.Types.ObjectId.isValid(userId)
    || typeof teamId !== 'string'
    || !mongoose.Types.ObjectId.isValid(teamId)
  ) {
    throw Object.assign(new Error('Valid userId and teamId are required'), { status: 400 });
  }
  if (typeof type !== 'string' || type.trim().length === 0 || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity type and positive minutes are required'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }
  if (!Array.isArray(members)) {
    throw Object.assign(new Error('Team members must be an array'), { status: 400 });
  }

  const memberIds = [...new Set(members)];
  if (memberIds.some((memberId) => typeof memberId !== 'string' || !mongoose.Types.ObjectId.isValid(memberId))) {
    throw Object.assign(new Error('Valid member IDs are required'), { status: 400 });
  }

  const existingMembers = await User.find({
    _id: { $in: memberIds as string[] },
  }).lean();
  if (existingMembers.length !== memberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });
  await User.updateMany(
    { _id: { $in: memberIds as string[] } },
    { $set: { team: team._id } },
  );

  return Team.findById(team._id).lean();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
  ]);

  if (totals.length === 0) return [];

  const teams = await Team.find({
    _id: { $in: totals.map((entry) => entry._id) },
  }).lean();
  const teamNames = new Map(
    teams.map((team) => [team._id.toString(), team.name]),
  );

  return totals
    .map((entry) => ({
      teamName: teamNames.get(entry._id.toString()) ?? 'Unknown team',
      totalPoints: entry.totalPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  if (typeof userEmail !== 'string' || userEmail.trim().length === 0) {
    throw Object.assign(new Error('User email is required'), { status: 400 });
  }

  const normalizedEmail = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id }).lean();
  const activityTypes = new Set(
    activities.map((activity) => activity.type.toLowerCase()),
  );
  const fitnessGoal = user.fitnessGoal?.toLowerCase();

  const focusForActivity = (type: string) => {
    if (type === 'run' || type === 'cycle') return 'endurance';
    if (type === 'strength') return 'strength';
    if (type === 'walk') return 'mobility';
    return type;
  };
  const targetFocuses = new Set([
    ...(fitnessGoal ? [fitnessGoal] : []),
    ...[...activityTypes].map(focusForActivity),
  ]);

  const workouts = await Workout.find().lean();
  const suggestions = workouts
    .map((workout) => {
      const focus = workout.focus?.toLowerCase() ?? '';
      const matchesGoal = fitnessGoal === focus;
      const matchingActivity = [...activityTypes].find(
        (type) => focusForActivity(type) === focus || type === focus,
      );
      const score = (matchesGoal ? 2 : 0) + (matchingActivity ? 1 : 0);
      const reason = matchingActivity
        ? `Matches your ${matchingActivity} activity and ${focus} focus`
        : matchesGoal
          ? `Matches your ${fitnessGoal} fitness goal`
          : `Suggested for ${targetFocuses.size > 0 ? 'your activity pattern' : 'general fitness'}`;
      return { ...workout, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...workout }) => workout);

  return suggestions;
}

export { User };
