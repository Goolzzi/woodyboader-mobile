import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  Text,
  FlatList,
  AsyncStorage,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';

import { NavigationActions } from 'react-navigation';

import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Collapsible from 'react-native-collapsible';
import * as firebase from 'firebase';

import SearchBar from '../components/SearchBar';
import Hr from '../components/Hr';
import Firebase from '../util/Firebase';
import { getChatTitle } from '../util/ChatUtils';

import Toast from 'react-native-easy-toast';

import Colors from '../constants/Colors';


const { width, height } = Dimensions.get('screen');

const userContainerWidth = width * .85;

const userInfoWidth = userContainerWidth * .85;
const userInfoIconWidth = userContainerWidth - userInfoWidth;

class Button extends React.Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => this.props.onPress()}
        style={this.props.style}>
        <View style={styles.buttonContentsContainer}>
          {this.props.iconName &&
            <MaterialIcons
              name={this.props.iconName}
              size={24}
              color={this.props.iconColor}
            />
          }
          <Text style={this.props.textStyle}>
            {this.props.text}
          </Text>
          { this.props.showActivityIndicator &&
            <ActivityIndicator
              style={styles.activityIndicator}
              color={'#fff'}
            />
          }
        </View>
      </TouchableOpacity>
    );
  }
}

/*
  - add user (if group chat) OR convert to group chat by creating a new chat
  - leave chat -> erase old messages?
    * only group chats?
  - set title
*/
class ChatSettingsScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.createChat ? 'START A CHAT' : 'DETAILS',
    gesturesEnabled: true,
    headerTitleStyle: {
      color: Colors.woodyBlue,
      fontFamily: 'CarterSansPro-Bold',
      fontSize: 18,
    },
    headerStyle: {
      marginTop: Platform.OS === 'ios' ? 0 : 25,
    },
  });

  state = {
    searchInputValue: null,
    chatInfo: {},
    chatId: null,
    addUserCollapsed: true,
    searchResults: [],
    addingUsers: false,
    usersToAdd: {},
    BlockedUsers:[],
    currentUserId: Firebase.getAuthenticatedUser().uid,
  }

  hr = (
    <Hr wrapperStyle={styles.hrWrapperStyle}/>
  )

  async componentWillMount() {
    //await AsyncStorage.removeItem("BlockLists");
    const { state } = this.props.navigation;
    this.blockedUsersList();

    if (state && state.params) {
      const currentUser = await Firebase.getCurrentUser();
      currentUser.id = this.state.currentUserId;
      if (!state.params.createChat) {
        this.setState({
          chatId: state.params.id,
          chatInfo: state.params.info,
          currentUser: currentUser,
        });
      }
      else {
        this.setState({
          currentUser: currentUser,
        });
      }
    }
  }

  _onSearchTextEntered(text) {
    this.setState({ searchInputValue: text });
    this._search(text);
  }

  _search(toSearchFor = null) {
    const { searchInputValue, usersToAdd, currentUser } = this.state;
    toSearchFor = toSearchFor || searchInputValue;

    const currentChatUsers = this.state.chatInfo.users || [currentUser.id];

    const ref = firebase.database().ref('users').orderByChild('name').startAt(toSearchFor).endAt(toSearchFor + '~').limitToFirst(5);
    ref.once('value', data => {
      const matchingUsers = data.val();
      const searchResults = [];
      if (matchingUsers !== null) {
        const users = Object.keys(matchingUsers)
          .map(userId => {
            if (!matchingUsers[userId].id) {
              matchingUsers[userId].id = userId;
            }
            return matchingUsers[userId];
          })
          .sort((userA, userB) => userA.name.localeCompare(userB.name));
        for (const user of users) {
          const hiddenFromResults =
            !user.isRegistered
            || currentChatUsers.includes(user.id)
            || usersToAdd[user.id] != null;
          if (!user.isRegistered || currentChatUsers.includes(user.id) || usersToAdd[user.id] != null) {
            continue;
          }
          searchResults.push({
            key: user.id,
            data: user
          });
        }
      }
      Object.keys(usersToAdd).forEach(userId => {
        searchResults.unshift({
          key: userId,
          data: usersToAdd[userId]
        });
      });
      this.setState({ searchResults: searchResults });
    });
  }

  _onUserPress(userId, userInfo) {
    // check if user is already in the chat
    const { chatId, chatInfo, usersToAdd } = this.state;

    // add to/remove from list
    if (usersToAdd[userId] != null) {
      this.setState(lastState => {
        const newUsersToAdd = Object.assign({}, lastState.usersToAdd);
        delete newUsersToAdd[userId];
        return { usersToAdd: newUsersToAdd };
      });
    }
    else {
      this.setState(lastState => {
        const newUsersToAdd = Object.assign({}, lastState.usersToAdd);
        newUsersToAdd[userId] = userInfo;
        return { usersToAdd: newUsersToAdd };
      });
    }
  }

  async blockUser(usersToAdd){

    for (const [key, value] of Object.entries(usersToAdd))
    {
    const  blockedId = `${key}`;
    firebase.database().ref('blockedUsers').child(blockedId).set(true);
    }
  }

  async blockedUsersList() {

    try {
  var BLOCKED = await AsyncStorage.getItem("BlockLists");
  if (BLOCKED !== null) {
    let BlockedUser = JSON.parse(BLOCKED);
    this.setState({BlockedUsers:BlockedUser})
  }
} catch (error) {
  console.log(error);
}
  //  var value = await AsyncStorage.getItem("BlockLists");
    //const BlockLists = AsyncStorage.getItem('BlockLists');
    //console.log("BlockLists", value)
    // const bl =  firebase.database().ref('blockedUsers');
    // console.log("bl", bl)
    //    bl.once('value', data => {
    //      const matchingUsers = data.val();
    //      console.log("matchingUsers",matchingUsers)
    //    })
  }

  async setBlockList(usersToAdd, blockORunblock)  {

    for (const [key, value] of Object.entries(usersToAdd))
    {
    const  blockedId = `${key}`;


  if(blockORunblock == 'BLOCK'){
  var BlockedID = {"userID":blockedId};

  var data =  await AsyncStorage.getItem('BlockLists');

  if(data == null || data.length ==0){
    try {
    var  Data = []
    Data.push(BlockedID);
      await AsyncStorage.setItem('BlockLists',  JSON.stringify(Data));
       this.componentWillMount();
    } catch (error) {
      console.log(error);
    }
  }
  else {
    try {
      var  Data = JSON.parse(data);
      Data.push(BlockedID);
      await AsyncStorage.setItem('BlockLists',  JSON.stringify(Data));
       this.componentWillMount();
    } catch (error) {
      console.log(error);
    }
  }
}
else {
  this.onPressunBlock(blockedId);
}
  }
  }


  async onPressunBlock(BlockedId)
  {
    try {
  var BLOCKED = await AsyncStorage.getItem("BlockLists");
  if (BLOCKED !== null) {
    let BlockedUser = JSON.parse(BLOCKED);

    const newid = false;
    if(BlockedUser != null || BlockedUser != undefined)
    {
    BlockedUser.map((Bl,i) => {
      if(Bl.userID == BlockedId){
        BlockedUser.splice(i, 1);
         AsyncStorage.setItem('BlockLists',  JSON.stringify(BlockedUser));
         console.log(AsyncStorage.getItem("BlockLists"))
         this.componentWillMount();
      }
    })
  }
  }
} catch (error) {
  console.log(error);
}
}

  async _addUsers(usersToAdd) {
    this.setState({ addingUsers: true });
    const { chatId, chatInfo } = this.state;
    const currentChatUsers = chatInfo.users || [];

    if (currentChatUsers.length <= 2) { // create a new chat
      this._createNewChat(usersToAdd);
    }
    else { // add these users to the room
      this._addUsersToCurrentChat(usersToAdd);
    }
  }

  async _addUsersToCurrentChat(usersToAdd) {
    const { chatId, chatInfo, } = this.state;
    const userIdsToAdd = Object.keys(usersToAdd);
    chatInfo.users.forEach(userId => {
      userIdsToAdd.push(userId);
    });

    // add chat id to each user's chats
    for (const userId of userIdsToAdd) {
      // get user's chats
      const userChatsRef = firebase.database().ref('users/' + userId + '/chats');
      userChatsRef.once('value', async snapshot => {
        const userChats = snapshot.val() || {};
        // chats are stored in user data as arrays of userids
        userChats[chatId] = userIdsToAdd;
        await userChatsRef.set(userChats);
      });
    }

    const currentChatRef = firebase.database().ref(`chats/${chatId}`);
    // update chatInfo
    const updates = {};
    for (const userId of Object.keys(usersToAdd)) {
      const user = usersToAdd[userId];
      chatInfo.usernames.push({
        id: user.id,
        name: user.name
      });
    }
    updates['users/'] = userIdsToAdd;
    updates['usernames/'] = chatInfo.usernames;

    await currentChatRef.update(updates);
    Alert.alert(
      'User(s) have been added',
      '',
      [
        {
          text: 'Dismiss',
          style: 'cancel'
        }
      ]
    );
  }

  async _createNewChat(usersToAdd) {
    const { currentUser, chatInfo } = this.state;

    if (!chatInfo.users) {
      chatInfo.users = [currentUser.id];
    }

    const userIdsToAdd = Object.keys(usersToAdd);
    // add existing users
    chatInfo.users.forEach(userId => {
      userIdsToAdd.push(userId);
    });
    const chats = currentUser.chats || {};


    // check if a chat already exists with these users
    let existingChatId = null;
    Object.keys(chats).forEach(chatId => {
      if (stringArraysEqual(chats[chatId], userIdsToAdd)) {
        existingChatId = chatId;
      }
    });

    const onDismiss = () => this.setState({ addingUsers: false });
    if (existingChatId !== null) {
      Alert.alert(
        'A chat with these users already exists',
        '',
        [
          {
            text: 'Go to chat',
            onPress: () => this._navigateToChat(existingChatId)
          },
          {
            text: 'Dismiss',
            onPress: () => onDismiss(),
            style: 'cancel'
          }
        ],
        {
          onDismiss: () => onDismiss(),
        }
      );
    }
    else {
      const { id, info } = await Firebase.createChat(userIdsToAdd);
      this._navigateToChat(id, info);
    }
  }

  async _navigateToChat(chatId, chatInfo) {
    // fetch the chat's info if not provided
    if (!chatInfo) {
      const chatRef = firebase.database().ref(`chats/${chatId}`);
      chatRef.once('value', data => {
        chatInfo = data.val();
        this._navigateToChatWithInfo(chatId, chatInfo);
      });
    }
    else {
      this._navigateToChatWithInfo(chatId, chatInfo);
    }
  }

  _navigateToChatWithInfo(chatId, chatInfo) {
    chatInfo.title = chatInfo.title || getChatTitle(chatInfo.usernames, this.state.currentUserId);

    // navigate to it
    const resetAction = NavigationActions.reset({
      index: 1,
      actions: [
        NavigationActions.navigate({ routeName: 'Home' }),
        NavigationActions.navigate({ routeName: 'ChatView', params: {
          id: chatId,
          info: chatInfo,
        }})
      ],
    });

    this.props.navigation.dispatch(resetAction);
  }

  _renderUser(key, data) {
    const { usersToAdd } = this.state;

    if (data.bio && data.bio.length > 80) {
      data.bio = data.bio.substring(0, 80) + '...';
    }
    return (
      <TouchableOpacity
        key={data.id}
        style={styles.userContainer}
        onPress={() => this._onUserPress(data.id, data)}>
        <View style={styles.touchableContentsContainer}>
          <View style={styles.userInfoContents}>
            <Text style={styles.usernameText}>
              {data.name.toUpperCase()}
            </Text>
            {data.city && data.state &&
              <Text style={styles.locationText}>
                {`${data.city}, ${data.state}`}
              </Text>
            }
            {data.bio &&
              <Text style={styles.userDescription}>
                {data.bio}
              </Text>
            }
          </View>
          <View style={styles.userInfoIconContainer}>
            { !usersToAdd[data.id] &&
              <Ionicons
                name="ios-add-circle-outline"
                size={28}
                color={Colors.tabIconDefault}
              />
            }
            { usersToAdd[data.id] &&
              <Ionicons
                name="ios-remove-circle"
                size={28}
                color={Colors.tabIconSelected}
              />
            }
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  render() {
    const { addUserCollapsed, setTitleCollapsed, usersToAdd } = this.state;
    const { createChat } = this.props.navigation.state.params;
    let newID = true;
    const buttonText = createChat ? 'CREATE' : 'ADD SELECTED USERS';
    let blockUser =  newID ? 'BLOCK' : 'UNBLOCK';
    const blockList =  'BLOCKED USERS LIST';

      for (const [key, value] of Object.entries(usersToAdd))
      {
      const  blockedId = `${key}`;
      const newid = false;
      this.state.BlockedUsers.map((Bl,i) => {
        if(Bl.userID == blockedId){
          newid = true;
        }
        else{
          newID = true;
            blockUser =  newID ? 'BLOCK' : 'UNBLOCK';
        }
        if(this.state.BlockedUsers.length == i+1 ){
          if(newid == true){
              newID = false;
              blockUser =  newID ? 'BLOCK' : 'UNBLOCK';
          }else {
            {
              newID = true;
                blockUser =  newID ? 'BLOCK' : 'UNBLOCK';
            }
          }

        }

      })


    }


    return (
      <View style={styles.container}>
        <StatusBar hidden={false}/>
        <View style={styles.collapsiblesContainer}>
          <Button
            style={styles.button}
            iconName={addUserCollapsed ? 'keyboard-arrow-right' : 'keyboard-arrow-down'}
            iconColor={Colors.tabIconDefault}
            textStyle={styles.buttonText}
            text="ADD PEOPLE TO CHAT"
            onPress={() => this.setState({ addUserCollapsed: !addUserCollapsed })}
          />
          <Collapsible collapsed={addUserCollapsed}>
            <View style={styles.addUserContainer}>
              <SearchBar
                containerStyle={styles.searchContainer}
                textStyle={styles.searchBarText}
                backgroundColor={Colors.defaultBackground}
                placeholder="SEARCH BY USERNAME"
                onChangeText={text => this._onSearchTextEntered(text)}
                value={this.state.searchInputValue}
                onSubmitEditing={() => this._search()}
              />
              <FlatList
                style={{height: height * .6,}}
                data={this.state.searchResults}
                initialNumToRender={5}
                renderItem={({item}) => this._renderUser(item.key, item.data)}
                ItemSeparatorComponent={() => this.hr}
                removeClippedSubviews={false}
              />
            </View>
          </Collapsible>
        </View>
           { //Object.keys(usersToAdd).length == 0  &&
        // <Button
        //   style={[styles.button, styles.redButton]}
        //   textStyle={[styles.buttonText, styles.whiteText]}
        //   text={blockList}
        //     onPress={() => this.blockedUsersList()}
        //   showActivityIndicator={this.state.addingUsers}
        // />
      }
        <View>
          { (Object.keys(usersToAdd).length !== 0) && ((Object.keys(usersToAdd).length == 1) ? newID == true : newID === newID) &&

            <Button
              style={[styles.button, styles.redButton]}
              textStyle={[styles.buttonText, styles.whiteText]}
              text={buttonText}
              onPress={() => this._addUsers(usersToAdd)}
              showActivityIndicator={this.state.addingUsers}
            />

          }
          {
            Object.keys(usersToAdd).length == 1 &&
              <Button
                style={[styles.button, styles.redButton]}
                textStyle={[styles.buttonText, styles.whiteText]}
                text={blockUser}
                onPress={() => this.setBlockList(usersToAdd,blockUser)}
                showActivityIndicator={this.state.addingUsers}
              />
          }
          {/*
            <Button
              style={[styles.button, styles.redButton]}
              textStyle={[styles.buttonText, styles.whiteText]}
              text="LEAVE CHAT"
              onPress={() => null}
            />
          */}
        </View>
        <Toast
          ref={toast => this._toast = toast}
          position="bottom"
        />
      </View>
    );
  }
}

// return true if array1 has same string contents as array2
const stringArraysEqual = (array1, array2) => {
  const sorted1 = array1.sort();
  const sorted2 = array2.sort();
  return sorted1.join(',') === sorted2.join(',');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityIndicator: {
    paddingHorizontal: 20,
  },
  touchableContentsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  collapsiblesContainer: {
    flex: 1,
    // marginTop: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  buttonContentsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addUserContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    width: width,
    height: 44,
    backgroundColor: 'rgb(238, 238, 238)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.searchBackground,
  },
  buttonText: {
    fontFamily: 'CarterSansPro-Bold',
    fontSize: 16,
    color: 'rgb(142, 138, 127)', //Colors.tabIconDefault,
    paddingLeft: 5,
  },
  hrWrapperStyle: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderBottomColor: Colors.searchBackground,
    borderBottomWidth: 1,
  },
  searchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgb(238, 238, 238)',
  },
  searchBarText: {
    textAlign: 'center',
    color: 'black',
    width: width - 20,
    backgroundColor: 'white',
    fontFamily: 'CarterSansPro-Bold',
    height: 44,
    fontSize: 13,
    borderRadius: 5,
  },
  redButton: {
    backgroundColor: Colors.tabIconSelected,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    width: width * .9,
    marginBottom: 10,
  },
  whiteText: {
    color: '#fff',
  },
  userContainer: {
    margin: 10,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: '#f2f2f2',
    width: width * .85,
  },
  usernameText: {
    color: Colors.tabIconSelected,
    fontFamily: 'CarterSansPro-Bold',
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'center',
  },
  userDescription: {
    fontSize: 11,
    color: Colors.tabIconDefault,
    marginVertical: 5,
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  userInfoContents: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: userInfoWidth
  },
  userInfoIconContainer: {
    width: userInfoIconWidth,
    justifyContent: 'center',
    alignItems: 'center'
  },
  locationText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
    fontFamily: 'Lato-Bold',
    paddingHorizontal: 2,
    color: Colors.tabIconDefault,
  }
});

export default ChatSettingsScreen;
