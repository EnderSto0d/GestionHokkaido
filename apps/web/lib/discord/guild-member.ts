import "server-only";

// TODO: Remplacer par l'ID du serveur Discord Hokkaido une fois créé
export const DISCORD_GUILD_ID = "HOKKAIDO_GUILD_ID_HERE";

export type DiscordGuildMember = {
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  nick: string | null;
  roles: string[];
  joined_at: string;
};

export async function fetchDiscordGuildMember(
  discordAccessToken: string,
  guildId: string = DISCORD_GUILD_ID
): Promise<DiscordGuildMember> {
  const response = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${discordAccessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Impossible de récupérer le membre Discord (${response.status}) : ${errorBody}`
    );
  }

  return (await response.json()) as DiscordGuildMember;
}

export async function fetchDiscordGuildRoles(
  discordAccessToken: string,
  guildId: string = DISCORD_GUILD_ID
): Promise<string[]> {
  const member = await fetchDiscordGuildMember(discordAccessToken, guildId);
  return member.roles;
}

/**
 * Récupère les données d'un membre via un bot token (ne nécessite pas d'OAuth user).
 * Utilise DISCORD_BOT_TOKEN depuis les variables d'environnement.
 */
export async function fetchDiscordGuildMemberByBot(
  discordUserId: string,
  guildId: string = DISCORD_GUILD_ID
): Promise<DiscordGuildMember> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN n'est pas configuré dans les variables d'environnement.");
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Impossible de récupérer le membre Discord (${response.status}) : ${errorBody}`
    );
  }

  return (await response.json()) as DiscordGuildMember;
}

/**
 * Ajoute un rôle Discord à un membre via le bot token.
 * Utilise PUT /guilds/{guildId}/members/{userId}/roles/{roleId}
 */
export async function addDiscordRoleToMember(
  discordUserId: string,
  roleId: string,
  guildId: string = DISCORD_GUILD_ID
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN n'est pas configuré dans les variables d'environnement.");
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  // 204 No Content = succès
  if (!response.ok && response.status !== 204) {
    const errorBody = await response.text();
    throw new Error(
      `Impossible d'ajouter le rôle Discord ${roleId} au membre ${discordUserId} (${response.status}) : ${errorBody}`
    );
  }
}

/**
 * Retire un rôle Discord d'un membre via le bot token.
 * Utilise DELETE /guilds/{guildId}/members/{userId}/roles/{roleId}
 */
export async function removeDiscordRoleFromMember(
  discordUserId: string,
  roleId: string,
  guildId: string = DISCORD_GUILD_ID
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN n'est pas configuré dans les variables d'environnement.");
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorBody = await response.text();
    throw new Error(
      `Impossible de retirer le rôle Discord ${roleId} du membre ${discordUserId} (${response.status}) : ${errorBody}`
    );
  }
}