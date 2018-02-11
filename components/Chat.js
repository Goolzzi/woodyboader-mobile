import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  AsyncStorage,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

import Colors from '../constants/Colors';

import { GiftedChat } from 'react-native-gifted-chat';

import * as firebase from 'firebase';
import moment from 'moment';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import { Ionicons } from '@expo/vector-icons';

import { getChatTitle } from '../util/ChatUtils';


const capitalizeSentence = require('capitalize-sentence');
const Filter = require('bad-words');
const badWordsFilter = new Filter();

/**
 * Utility class for creating messages
 */
class Message {
  constructor(message) {
    // apply the properties from the given message to this
    Object.assign(this, message);
    if (this.createdAt && typeof this.createdAt !== 'string') {
      this.createdAt = message.createdAt.toUTCString();
    }
  }
}

class ChatSettingsButton extends React.Component {
  render() {
    return (
      <TouchableOpacity onPress={() => this.props.onPress()}>
        <Ionicons
          name="ios-settings-outline"
          size={32}
          color={Colors.tabIconDefault}
          style={styles.settingsIcon}
        />
      </TouchableOpacity>
    );
  }
}

class Chat extends React.Component {
  state = {
    settingsModalVisible: false,
  }

  // Nav options can be defined as a function of the screen's props:
  static navigationOptions = ({ navigation }) => ({
    title: `${navigation.state.params.info.title}`,
    headerTitleStyle: {
      color: Colors.woodyBlue,
      fontFamily: 'Lato-Bold',
      fontSize: 18,
    },
    headerStyle: {
      marginTop: Platform.OS === 'ios' ? 0 : 25,
    },
    headerRight: (
      <ChatSettingsButton
        onPress={() => {
          navigation.navigate('ChatSettingsScreen', navigation.state.params);
        }}
      />
    ),
    gesturesEnabled: true,
  });

  async componentWillMount() {

    const { id, info } = this.props.navigation.state.params;
    const messagesRef = firebase.database().ref(`messages/${id}`);
    const chatRef = firebase.database().ref(`chats/${id}`);
    const userId = firebase.auth().currentUser.uid;
    const username = info.usernames.filter(user => user.id === userId)[0].name;
    this.blockedUsersList(info, userId);
    this.setState({
      messages: [],
      id: id,
      info: info,
      messagesRef: messagesRef,
      userId: userId,
      chatRef: chatRef,
      username: username,
      chatTrue: true,
      blockedid: '',
    });
    // fetch chat messages
    this.addEventListeners(id, info, messagesRef, chatRef);
  }

  async blockedUsersList(info, userId) {

    let blockedUserId;
    if (info.users[0] != userId) {
      blockedUserId = info.users[0];
    } else {
      blockedUserId = info.users[1]
    }

    try {
      var BLOCKED = await AsyncStorage.getItem("BlockLists");
      console.log(">>>BLOCKED>>>>>>>>", BLOCKED)
      this.setState({ blockedid: blockedUserId })
      if (BLOCKED !== null) {
        let BlockedUser = JSON.parse(BLOCKED);

        const newid = false;
        if (BlockedUser != null || BlockedUser != undefined) {
          BlockedUser.map((Bl, i) => {
            if (Bl.userID == blockedUserId) {
              newid = true;
            }
            if (BlockedUser.length == i + 1) {
              if (newid == true) {
                this.setState({ chatTrue: false })
              } else {
                {
                  this.setState({ chatTrue: true })
                }
              }
            }
          })
        }
      }
    } catch (error) {
      console.log(error);
    }
  }


  async onPressunBlock() {
    try {
      var BLOCKED = await AsyncStorage.getItem("BlockLists");
      if (BLOCKED !== null) {
        let BlockedUser = JSON.parse(BLOCKED);

        const newid = false;
        if (BlockedUser != null || BlockedUser != undefined) {
          BlockedUser.map((Bl, i) => {
            console.log(this.state.blockedid)
            if (Bl.userID == this.state.blockedid) {
              BlockedUser.splice(i, 1);
              AsyncStorage.setItem('BlockLists', JSON.stringify(BlockedUser));
              this.componentWillMount();
            }
          })
        }
      }
    } catch (error) {
      console.log(error);
    }


  }

  componentWillUnmount() {
    const { messagesRef, chatRef } = this.state;
    messagesRef.off('child_added');
    messagesRef.off('child_changed');
    chatRef.off('child_changed');
  }

  addEventListeners(id, info, messagesRef, chatRef) {
    messagesRef.on('child_added', data => this.onMessageAdded(data));
    messagesRef.on('child_changed', data => this.onMessageAdded(data));
    chatRef.on('child_changed', data => this.onMetadataUpdate(data));
  }

  onMetadataUpdate(data) {
    const newChatInfo = data.val();
    if (!newChatInfo.title) {
      newChatInfo.title = getChatTitle(newChatInfo.usernames, this.state.userId);
    }

    this.props.navigation.setParams({ /*info: newChatInfo,*/ id: data.key });
  }

  onMessageAdded(data) {
    const id = data.key;
    const message = new Message(data.val());

    // console.log('Retrieved message content: ', message);
    // if (message && !message.sanitized) {
    //   console.log('Retrieved message content: ', message);
    //   const moderatedMessage = this.moderateMessage(message.text);
    //   console.log('Message has been moderated. Saving to DB: ', moderatedMessage);
    //   return data.ref.update({
    //     text: moderatedMessage,
    //     sanitized: true,
    //     moderated: message.text !== moderatedMessage
    //   });
    //  }

    this.setState(prevState => ({
      messages: GiftedChat.append(prevState.messages, [message])
    }));
  }

  moderateMessage(message) {
    // Re-capitalize if the user is Shouting.
    if (this.isShouting(message)) {
      console.log('User is shouting. Fixing sentence case...');
      message = this.stopShouting(message);
    }

    // Moderate if the user uses SwearWords.
    if (this.containsSwearwords(message)) {
      console.log('User is swearing. moderating...');
      message = this.moderateSwearwords(message);
    }

    return message;
  }

  // Returns true if the string contains swearwords.
  containsSwearwords(message) {
    return message !== badWordsFilter.clean(message);
  }

  // Hide all swearwords. e.g: Crap => ****.
  moderateSwearwords(message) {
    return badWordsFilter.clean(message);
  }

  // Detect if the current message is shouting. i.e. there are too many Uppercase
  // characters or exclamation points.
  isShouting(message) {
    return message.replace(/[^A-Z]/g, '').length > message.length / 2 || message.replace(/[^!]/g, '').length >= 3;
  }

  // Correctly capitalize the string as a sentence (e.g. uppercase after dots)
  // and remove exclamation points.
  stopShouting(message) {
    return capitalizeSentence(message.toLowerCase()).replace(/!+/g, '.');
  }

  // Handles the event emitted by sending a message
  async onSend(messages = []) {
    const { id, messagesRef } = this.state;
    const moderatedMessage = this.moderateMessage(messages[0].text);
    // Add the message to firebase
    for (const msg of messages) {
      messages[0].text = moderatedMessage;
      const newMessageRef = messagesRef.push();
      await newMessageRef.set(new Message(msg));
    }

    // Update chat meta info
    const lastMessage = messages[0];
    this.updateChatInfo(new Message(lastMessage));

    /*
    ---
    TODO: Have "sending" state that updates when we confirm that
    the message has been added to the database
    ---
    */
  }

  async updateChatInfo(lastMessage) {
    const { chatRef } = this.state;

    const updates = {};
    updates['lastActivity/'] = lastMessage.createdAt;
    updates['lastMessage/'] = lastMessage.text;
    updates['lastMessageAuthor/'] = lastMessage.user;
    updates['lastMessageTimestamp/'] = Date.now();

    await chatRef.update(updates);
  }

  render() {
    // The screen's current route is passed in to `props.navigation.state`:
    const { userId, username } = this.state;
    console.log("kjsagdss", this.state.chatTrue)
    return (
      <View style={styles.container}>
        <StatusBar hidden={false} />
        {this.state.chatTrue ?
          <GiftedChat
            messages={this.state.messages}
            onSend={(messages) => this.onSend(messages)}
            user={{
              _id: userId,
              name: username,
            }}
          />
          :
          <View style={{ position: "absolute", bottom: 0 }}>
            <TouchableOpacity
              onPress={() => this.onPressunBlock()}
              style={styles.button}>
              <View style={styles.buttonContentsContainer}>

                <Text style={styles.buttonText}>
                  UNBLOCK
      </Text>

              </View>
            </TouchableOpacity>

          </View>}
        {Platform.OS === 'android' ? <KeyboardSpacer /> : null}
      </View>
    );
  }
}

const { width, height } = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    width: width,
    height: 44,
    backgroundColor: '#df1f26',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 0,
    borderBottomWidth: 1,
  },
  buttonContentsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'CarterSansPro-Bold',
    fontSize: 16,
    color: 'white', //Colors.tabIconDefault,
    paddingLeft: 5,
  },
  settingsIcon: {
    paddingHorizontal: 10
  },
});

export default Chat;
