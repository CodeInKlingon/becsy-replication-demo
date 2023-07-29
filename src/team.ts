import { component, field, World } from '@lastolivegames/becsy';

const Team = World.defineEnum('myEnum');

@component(Team)
class Team1 {}

@component(Team)
class Team2 {}

@component(Team)
class Team3 {}

@component(Team)
class Team4 {}

@component(Team)
class Team5 {}

@component(Team)
class Team6 {}
