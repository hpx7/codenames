import { Methods } from "./.rtag/methods";
import {
  PlayerData,
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
} from "./.rtag/types";
import { wordList } from "./words";
import { shuffle } from "./utils";

interface InternalState {
  players: PlayerInfo[];
  currentTurn: Color;
  cards: Card[];
}

export class Impl implements Methods<InternalState> {
  createGame(userData: PlayerData, request: ICreateGameRequest): InternalState {
    return {
      players: [createPlayer(userData.playerName)],
      currentTurn: Color.YELLOW,
      cards: [],
    };
  }
  joinGame(state: InternalState, userData: PlayerData, request: IJoinGameRequest): string | void {
    if (getGameStatus(state.cards) != GameStatus.NOT_STARTED) {
      return "Game already started";
    }
    if (state.players.find((player) => player.name == userData.playerName)) {
      return "Already joined";
    }
    state.players.push(createPlayer(userData.playerName));
  }
  startGame(state: InternalState, userData: PlayerData, request: IStartGameRequest): string | void {
    if (getGameStatus(state.cards) == GameStatus.IN_PROGRESS) {
      return "Game is in progress";
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
    }
    state.players[0].isSpymaster = true;
    state.players[state.players.length - 1].isSpymaster = true;
    state.currentTurn = Color.RED;
  }
  giveClue(state: InternalState, userData: PlayerData, request: IGiveClueRequest): string | void {
    throw new Error("Method not implemented.");
  }
  selectCard(state: InternalState, userData: PlayerData, request: ISelectCardRequest): string | void {
    if (getGameStatus(state.cards) != GameStatus.IN_PROGRESS) {
      return "Game is over";
    }
    const player = state.players.find((player) => player.name == userData.playerName);
    if (player == undefined) {
      return "Invalid player";
    }
    if (player.isSpymaster) {
      return "Spymaster cannot select card";
    }
    if (player.team != state.currentTurn) {
      return "Not your turn";
    }
    const selectedCard = state.cards.find((card) => card.word == request.word);
    if (selectedCard == undefined) {
      return "Invalid card selection";
    }
    if (selectedCard.selectedBy != undefined) {
      return "Card already selected";
    }
    selectedCard.selectedBy = player.team;
    if (selectedCard.color != state.currentTurn) {
      state.currentTurn = nextTurn(state.currentTurn);
    }
  }
  endTurn(state: InternalState, userData: PlayerData, request: IEndTurnRequest): string | void {
    if (getGameStatus(state.cards) != GameStatus.IN_PROGRESS) {
      return "Game is over";
    }
    const player = state.players.find((player) => player.name == userData.playerName);
    if (player == undefined) {
      return "Invalid player";
    }
    if (player.isSpymaster) {
      return "Spymaster cannot end turn";
    }
    if (player.team != state.currentTurn) {
      return "Not your turn";
    }
    state.currentTurn = nextTurn(state.currentTurn);
  }
  getUserState(state: InternalState, userData: PlayerData): PlayerState {
    const player = state.players.find((player) => player.name == userData.playerName);
    const gameStatus = getGameStatus(state.cards);
    return {
      players: state.players,
      gameStatus,
      currentTurn: state.currentTurn,
      cards: player?.isSpymaster || gameStatus != GameStatus.IN_PROGRESS ? state.cards : state.cards.map(sanitizeCard),
    };
  }
}

function createPlayer(name: PlayerName) {
  return { name, team: Color.YELLOW, isSpymaster: false };
}

function getGameStatus(cards: Card[]): GameStatus {
  const blackCard = cards.find((card) => card.color == Color.BLACK);
  if (blackCard == undefined){
    return GameStatus.NOT_STARTED;
  }
  if (blackCard.selectedBy == Color.BLUE || remainingCards(cards, Color.RED) == 0) {
    return GameStatus.RED_WON;
  } else if (blackCard.selectedBy == Color.RED || remainingCards(cards, Color.BLUE) == 0) {
    return GameStatus.BLUE_WON;
  }
  return GameStatus.IN_PROGRESS;
}

function chooseCards(words: string[], num: number, color: Color) {
  return [...Array(num).keys()].map((_) => ({ word: words.pop()!, color }));
}

function nextTurn(turn: Color): Color {
  return turn == Color.BLUE ? Color.RED : Color.BLUE;
}

function sanitizeCard(card: Card): Card {
  return card.selectedBy != undefined ? card : { ...card, color: undefined };
}

function remainingCards(cards: Card[], color: Color): number {
  return cards.filter((card) => card.selectedBy == undefined && card.color == color).length;
}
