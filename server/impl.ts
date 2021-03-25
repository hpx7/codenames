import { Methods } from "./.rtag/methods";
import {
  UserData,
  ICreateGameRequest,
  IJoinGameRequest,
  IStartGameRequest,
  IGiveClueRequest,
  ISelectCardRequest,
  IEndTurnRequest,
  PlayerState,
  Card,
  Color,
  PlayerInfo,
  PlayerName,
  GameStatus,
  TurnInfo,
  Result,
} from "./.rtag/types";
import { wordList } from "./words";
import { shuffle } from "./utils";

interface InternalState {
  players: PlayerInfo[];
  currentTurn: Color;
  cards: Card[];
  turnInfo?: TurnInfo;
}

export class Impl implements Methods<InternalState> {
  createGame(userData: UserData, request: ICreateGameRequest): InternalState {
    return {
      players: [createPlayer(userData.name)],
      currentTurn: Color.YELLOW,
      cards: [],
    };
  }
  joinGame(state: InternalState, userData: UserData, request: IJoinGameRequest): Result {
    if (getGameStatus(state.cards) !== GameStatus.NOT_STARTED) {
      return Result.error("Game already started");
    }
    if (state.players.find((player) => player.name === userData.name)) {
      return Result.error("Already joined");
    }
    state.players.push(createPlayer(userData.name));
    return Result.success();
  }
  startGame(state: InternalState, userData: UserData, request: IStartGameRequest): Result {
    if (getGameStatus(state.cards) === GameStatus.IN_PROGRESS) {
      return Result.error("Game is in progress");
    }
    if (state.players.length < 4) {
      return Result.error("Not enough players joined");
    }

    // set up cards
    const shuffledList = shuffle(wordList);
    state.cards = [];
    state.cards.push(...chooseCards(shuffledList, 9, Color.RED));
    state.cards.push(...chooseCards(shuffledList, 8, Color.BLUE));
    state.cards.push(...chooseCards(shuffledList, 7, Color.YELLOW));
    state.cards.push(...chooseCards(shuffledList, 1, Color.BLACK));
    state.cards = shuffle(state.cards);

    // set up teams
    state.players = shuffle(state.players);
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].team = i * 2 < state.players.length ? Color.RED : Color.BLUE;
      state.players[i].isSpymaster = false;
    }
    state.players[0].isSpymaster = true;
    state.players[state.players.length - 1].isSpymaster = true;
    state.currentTurn = Color.RED;
    return Result.success();
  }
  giveClue(state: InternalState, userData: UserData, request: IGiveClueRequest): Result {
    if (getGameStatus(state.cards) !== GameStatus.IN_PROGRESS) {
      return Result.error("Game is over");
    }
    const player = state.players.find((player) => player.name === userData.name);
    if (player === undefined) {
      return Result.error("Invalid player");
    }
    if (!player.isSpymaster) {
      return Result.error("Only spymaster can give clue");
    }
    if (player.team !== state.currentTurn) {
      return Result.error("Not your turn");
    }
    state.turnInfo = { hint: request.hint, amount: request.amount, guessed: 0 };
    return Result.success();
  }
  selectCard(state: InternalState, userData: UserData, request: ISelectCardRequest): Result {
    if (getGameStatus(state.cards) !== GameStatus.IN_PROGRESS) {
      return Result.error("Game is over");
    }
    const player = state.players.find((player) => player.name === userData.name);
    if (player === undefined) {
      return Result.error("Invalid player");
    }
    if (player.isSpymaster) {
      return Result.error("Spymaster cannot select card");
    }
    if (player.team !== state.currentTurn) {
      return Result.error("Not your turn");
    }
    if (state.turnInfo === undefined) {
      return Result.error("Spymaster has not yet given clue");
    }
    const selectedCard = state.cards.find((card) => card.word === request.word);
    if (selectedCard === undefined) {
      return Result.error("Invalid card selection");
    }
    if (selectedCard.selectedBy !== undefined) {
      return Result.error("Card already selected");
    }
    selectedCard.selectedBy = player.team;
    state.turnInfo.guessed += 1;
    if (selectedCard.color !== state.currentTurn || state.turnInfo.guessed > state.turnInfo.amount) {
      state.currentTurn = nextTurn(state.currentTurn);
      state.turnInfo = undefined;
    }
    return Result.success();
  }
  endTurn(state: InternalState, userData: UserData, request: IEndTurnRequest): Result {
    if (getGameStatus(state.cards) !== GameStatus.IN_PROGRESS) {
      return Result.error("Game is over");
    }
    const player = state.players.find((player) => player.name === userData.name);
    if (player === undefined) {
      return Result.error("Invalid player");
    }
    if (player.isSpymaster) {
      return Result.error("Spymaster cannot end turn");
    }
    if (player.team !== state.currentTurn) {
      return Result.error("Not your turn");
    }
    state.currentTurn = nextTurn(state.currentTurn);
    state.turnInfo = undefined;
    return Result.success();
  }
  getUserState(state: InternalState, userData: UserData): PlayerState {
    const player = state.players.find((player) => player.name === userData.name);
    const gameStatus = getGameStatus(state.cards);
    return {
      players: state.players,
      gameStatus,
      currentTurn: state.currentTurn,
      turnInfo: state.turnInfo,
      cards: player?.isSpymaster || gameStatus !== GameStatus.IN_PROGRESS ? state.cards : state.cards.map(sanitizeCard),
      redRemaining: remainingCards(state.cards, Color.RED),
      blueRemaining: remainingCards(state.cards, Color.BLUE),
    };
  }
}

function createPlayer(name: PlayerName) {
  return { name, team: Color.YELLOW, isSpymaster: false };
}

function getGameStatus(cards: Card[]): GameStatus {
  const blackCard = cards.find((card) => card.color === Color.BLACK);
  if (blackCard === undefined) {
    return GameStatus.NOT_STARTED;
  }
  if (blackCard.selectedBy === Color.BLUE || remainingCards(cards, Color.RED) === 0) {
    return GameStatus.RED_WON;
  } else if (blackCard.selectedBy === Color.RED || remainingCards(cards, Color.BLUE) === 0) {
    return GameStatus.BLUE_WON;
  }
  return GameStatus.IN_PROGRESS;
}

function chooseCards(words: string[], num: number, color: Color): Card[] {
  return [...Array(num).keys()].map((_) => ({ word: words.pop()!, color, selectedBy: undefined }));
}

function nextTurn(turn: Color): Color {
  return turn === Color.BLUE ? Color.RED : Color.BLUE;
}

function sanitizeCard(card: Card): Card {
  return card.selectedBy !== undefined ? card : { ...card, color: undefined };
}

function remainingCards(cards: Card[], color: Color): number {
  return cards.filter((card) => card.selectedBy === undefined && card.color === color).length;
}
